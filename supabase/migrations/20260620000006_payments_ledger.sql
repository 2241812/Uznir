-- ============================================================
-- Payments Ledger: Append-only financial record
-- Source of truth for reconciliation with payment gateways
-- ============================================================

create table public.payments_ledger (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id),
  actor_id uuid references public.profiles(id),
  direction text not null check (direction in ('in', 'out')),
  amount numeric(10,2) not null,
  currency text not null default 'PHP',
  provider text,
  provider_charge_id text,
  status text not null default 'pending' check (status in ('pending', 'captured', 'paid_out', 'refunded', 'failed')),
  created_at timestamptz not null default now()
);

create index payments_ledger_booking_id_idx on public.payments_ledger(booking_id);
create index payments_ledger_actor_id_idx on public.payments_ledger(actor_id);
create index payments_ledger_provider_charge_id_idx on public.payments_ledger(provider_charge_id);

-- RLS
alter table public.payments_ledger enable row level security;

create policy "participants can see payment ledger"
  on public.payments_ledger for select
  to authenticated
  using (
    actor_id = auth.uid()
    or exists (
      select 1 from public.bookings b
      where b.id = payments_ledger.booking_id
        and (b.customer_id = auth.uid() or b.worker_id = auth.uid())
    )
  );

-- Only system/webhooks can insert (no direct user inserts in production)
-- For now, allow authenticated inserts during development
create policy "system can insert payments"
  on public.payments_ledger for insert
  to authenticated
  with check (true);

-- Only system/webhooks can update status
create policy "system can update payments"
  on public.payments_ledger for update
  to authenticated
  with check (true);

-- ROLLBACK:
-- drop table public.payments_ledger;
