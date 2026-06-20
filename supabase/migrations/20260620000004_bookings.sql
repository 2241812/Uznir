-- ============================================================
-- Bookings: Created when a customer accepts a bid
-- ============================================================

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled', 'disputed')),
  scheduled_at timestamptz,
  final_price numeric(10,2),
  created_at timestamptz not null default now()
);

create index bookings_customer_id_idx on public.bookings(customer_id);
create index bookings_worker_id_idx on public.bookings(worker_id);
create index bookings_status_idx on public.bookings(status);

-- RLS
alter table public.bookings enable row level security;

create policy "booking participants can read"
  on public.bookings for select
  to authenticated
  using (
    customer_id = auth.uid() or worker_id = auth.uid()
  );

create policy "participants can insert bookings"
  on public.bookings for insert
  to authenticated
  with check (
    customer_id = auth.uid() or worker_id = auth.uid()
  );

create policy "participants can update bookings"
  on public.bookings for update
  to authenticated
  using (
    customer_id = auth.uid() or worker_id = auth.uid()
  )
  with check (
    customer_id = auth.uid() or worker_id = auth.uid()
  );

-- ROLLBACK:
-- drop table public.bookings;
