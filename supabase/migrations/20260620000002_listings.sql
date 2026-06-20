-- ============================================================
-- Listings: Jobs posted by customers
-- ============================================================

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  trade_id int references public.trades(id),
  budget numeric(10,2),
  status text not null default 'open' check (status in ('open', 'awarded', 'in_progress', 'done', 'cancelled')),
  location geography(point, 4326),
  created_at timestamptz not null default now()
);

create index listings_customer_id_idx on public.listings(customer_id);
create index listings_status_idx on public.listings(status);
create index listings_trade_id_idx on public.listings(trade_id);
create index listings_location_idx on public.listings using gist (location);

-- RLS
alter table public.listings enable row level security;

create policy "listings: customer sees own, worker sees open"
  on public.listings for select
  to authenticated
  using (
    auth.uid() = customer_id
    or status = 'open'
    or exists (
      select 1 from public.bids b
      where b.listing_id = listings.id and b.worker_id = auth.uid()
    )
  );

create policy "customers create listings"
  on public.listings for insert
  to authenticated
  with check (
    auth.uid() = customer_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.role = 'customer' or p.role = 'both')
    )
  );

create policy "customers update own listings"
  on public.listings for update
  to authenticated
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

create policy "customers delete own listings"
  on public.listings for delete
  to authenticated
  using (auth.uid() = customer_id);

-- ROLLBACK:
-- drop table public.listings;
