-- ============================================================
-- Bids: Workers apply to listings
-- ============================================================

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (listing_id, worker_id)
);

create index bids_listing_id_idx on public.bids(listing_id);
create index bids_worker_id_idx on public.bids(worker_id);

-- RLS
alter table public.bids enable row level security;

create policy "workers see own bids"
  on public.bids for select
  to authenticated
  using (
    auth.uid() = worker_id
    or exists (
      select 1 from public.listings l
      where l.id = bids.listing_id and l.customer_id = auth.uid()
    )
  );

create policy "workers create bids"
  on public.bids for insert
  to authenticated
  with check (
    auth.uid() = worker_id
    and exists (
      select 1 from public.listings l
      where l.id = bids.listing_id and l.status = 'open'
    )
  );

create policy "workers update own bids"
  on public.bids for update
  to authenticated
  using (auth.uid() = worker_id)
  with check (auth.uid() = worker_id);

-- Customer can update bid status (accept/reject) on their own listings
create policy "customers update bids on their listings"
  on public.bids for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = bids.listing_id and l.customer_id = auth.uid()
    )
  );

-- Now that bids table exists, update the listings SELECT policy so workers
-- can also see listings they've bid on.
drop policy "listings: customer sees own, worker sees open" on public.listings;
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

-- ROLLBACK:
-- drop table public.bids;
