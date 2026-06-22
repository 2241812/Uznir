-- ============================================================
-- Hardening: bookings uniqueness + RPC input validation
-- Keeps the original function signatures intact so existing callers
-- (nearby/page.tsx, find-work) are not broken.
-- ============================================================

-- 1. Prevent double-booking of the same listing.
--    acceptBid reads listing.status then inserts a booking without a
--    transaction/lock (TOCTOU). This partial unique index is the DB-level
--    backstop: only one *active* booking per listing is allowed. Cancelled
--    bookings don't count, so a listing can be re-awarded after cancellation.
create unique index if not exists bookings_one_active_per_listing_idx
  on public.bookings (listing_id)
  where status in ('scheduled', 'in_progress', 'disputed', 'completed');

-- 2. nearby_workers: reject nonsensical radius/lat/lng values.
--    Same signature as the original so callers don't break.
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
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_radius_km is null or p_radius_km <= 0 or p_radius_km > 200 then
    raise exception 'p_radius_km must be between 0 and 200' using errcode = '22023';
  end if;
  if p_lat is null or p_lat < -90 or p_lat > 90 then
    raise exception 'p_lat must be between -90 and 90' using errcode = '22023';
  end if;
  if p_lng is null or p_lng < -180 or p_lng > 180 then
    raise exception 'p_lng must be between -180 and 180' using errcode = '22023';
  end if;

  return query
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
end;
$$;

-- CREATE OR REPLACE preserves existing grants, but be explicit.
grant execute on function public.nearby_workers(float, float, float, int) to authenticated;

-- 3. search_listings: treat whitespace-only queries the same as empty.
--    Same signature as the original.
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
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_limit is null or p_limit <= 0 or p_limit > 100 then
    raise exception 'p_limit must be between 1 and 100' using errcode = '22023';
  end if;

  return query
  select
    l.id,
    l.title,
    l.description,
    l.trade_id,
    l.budget,
    l.status,
    l.created_at,
    ts_rank(l.search_vector, websearch_to_tsquery('english', coalesce(p_query, ''))) as rank
  from public.listings l
  where l.status = 'open'
    and (
      p_query is null
      or btrim(p_query) = ''         -- whitespace-only => match all open listings
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
end;
$$;

grant execute on function public.search_listings(text, int, float, float, float, int) to authenticated;
