-- ============================================================
-- Trades: Reference table for job categories / worker skills
-- ============================================================

create table public.trades (
  id int primary key,
  slug text unique not null,
  name text not null
);

-- ============================================================
-- Worker Profiles: Extended profile for workers
-- ============================================================

create table public.worker_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  bio text,
  hourly_rate numeric(10,2),
  location geography(point, 4326),
  is_available boolean default true,
  rating numeric(2,1) default 0.0,
  created_at timestamptz not null default now()
);

-- GIST index for PostGIS location queries
create index worker_profiles_location_idx
  on public.worker_profiles using gist (location);

-- ============================================================
-- Worker Trades: Many-to-many join
-- ============================================================

create table public.worker_trades (
  worker_id uuid references public.worker_profiles(profile_id) on delete cascade,
  trade_id int references public.trades(id) on delete cascade,
  primary key (worker_id, trade_id)
);

-- RLS: Worker profiles
alter table public.worker_profiles enable row level security;

create policy "authenticated users can read worker profiles"
  on public.worker_profiles for select
  to authenticated
  using (true);

create policy "workers update own profile"
  on public.worker_profiles for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "workers can insert own profile"
  on public.worker_profiles for insert
  to authenticated
  with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.role = 'worker' or p.role = 'both')
    )
  );

-- RLS: Worker trades
alter table public.worker_trades enable row level security;

create policy "authenticated users can read worker trades"
  on public.worker_trades for select
  to authenticated
  using (true);

create policy "workers manage own trades"
  on public.worker_trades for all
  to authenticated
  using (auth.uid() = worker_id)
  with check (auth.uid() = worker_id);

-- ROLLBACK:
-- drop table public.worker_trades;
-- drop table public.worker_profiles;
-- drop table public.trades;
