-- ============================================================
-- PostGIS: "Who's near?" RPC
-- The canonical way to find workers within a radius of a point
-- ============================================================

create or replace function public.nearby_workers(
  p_lat float,
  p_lng float,
  p_radius_km float,
  p_trade_id int default null
)
returns table (
  profile_id uuid,
  display_name text,
  avatar_url text,
  hourly_rate numeric,
  rating numeric,
  distance_km float
)
language sql stable as $$
  select
    wp.profile_id,
    p.display_name,
    p.avatar_url,
    wp.hourly_rate,
    wp.rating,
    st_distance(
      wp.location,
      st_makepoint(p_lng, p_lat)::geography
    ) / 1000.0 as distance_km
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.profile_id
  where wp.is_available
    and wp.location is not null
    and st_dwithin(
      wp.location,
      st_makepoint(p_lng, p_lat)::geography,
      p_radius_km * 1000
    )
    and (
      p_trade_id is null
      or exists (
        select 1 from public.worker_trades wt
        where wt.worker_id = wp.profile_id and wt.trade_id = p_trade_id
      )
    )
  order by distance_km;
$$;

-- Grant execute to authenticated users
grant execute on function public.nearby_workers(float, float, float, int) to authenticated;

-- ============================================================
-- Full-text search for listings
-- ============================================================

-- Add search vector column to listings
alter table public.listings add column search_vector tsvector;

-- Create GIN index on search vector
create index listings_search_vector_idx on public.listings using gin (search_vector);

-- Update trigger: auto-generate search_vector from title + description
create or replace function public.listings_search_vector_update()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B');
  return new;
end;
$$ language plpgsql;

create trigger listings_search_vector_trigger
  before insert or update of title, description
  on public.listings
  for each row execute procedure public.listings_search_vector_update();

-- RPC: Search listings by text, trade, and location
create or replace function public.search_listings(
  p_query text,
  p_trade_id int default null,
  p_lat float default null,
  p_lng float default null,
  p_radius_km float default null,
  p_limit int default 20
)
returns table (
  id uuid,
  title text,
  description text,
  trade_id int,
  budget numeric,
  status text,
  created_at timestamptz,
  rank real
)
language sql stable as $$
  select
    l.id,
    l.title,
    l.description,
    l.trade_id,
    l.budget,
    l.status,
    l.created_at,
    ts_rank(l.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.listings l
  where l.status = 'open'
    and (
      p_query is null or p_query = ''
      or l.search_vector @@ websearch_to_tsquery('english', p_query)
    )
    and (p_trade_id is null or l.trade_id = p_trade_id)
    and (
      p_lat is null or p_lng is null or p_radius_km is null
      or (
        l.location is not null
        and st_dwithin(
          l.location,
          st_makepoint(p_lng, p_lat)::geography,
          p_radius_km * 1000
        )
      )
    )
  order by rank desc nulls last, l.created_at desc
  limit p_limit;
$$;

grant execute on function public.search_listings(text, int, float, float, float, int) to authenticated;

-- ============================================================
-- Helper: Update worker rating aggregate
-- ============================================================

create or replace function public.update_worker_rating()
returns trigger as $$
begin
  update public.worker_profiles
  set rating = (
    select round(avg(r.rating)::numeric, 1)
    from public.reviews r
    join public.bookings b on b.id = r.booking_id
    where b.worker_id = new.subject_id
  )
  where profile_id = new.subject_id;
  return new;
end;
$$ language plpgsql;

create trigger update_worker_rating_trigger
  after insert or update of rating
  on public.reviews
  for each row execute procedure public.update_worker_rating();

-- ROLLBACK:
-- drop trigger update_worker_rating_trigger on public.reviews;
-- drop function public.update_worker_rating();
-- drop function public.search_listings(text, int, float, float, float, int);
-- drop trigger listings_search_vector_trigger on public.listings;
-- drop function public.listings_search_vector_update();
-- drop index listings_search_vector_idx;
-- alter table public.listings drop column search_vector;
-- revoke execute on function public.nearby_workers(float, float, float, int) from authenticated;
-- drop function public.nearby_workers(float, float, float, int);
