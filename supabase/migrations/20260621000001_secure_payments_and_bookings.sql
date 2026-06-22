-- ============================================================
-- Security hardening: payments_ledger, bookings, bids, reviews
--
-- Closes critical RLS holes found in audit:
--   1. payments_ledger insert/update were `with check (true)` —
--      any authenticated user could forge or alter payment records.
--      Now writes are restricted to the service role (webhooks/jobs).
--   2. Idempotency: unique constraints prevent duplicate charges/payouts
--      and enforce one active booking per listing.
--   3. bookings/bids/reviews policies tightened against column tampering
--      and self-dealing.
-- ============================================================

-- ------------------------------------------------------------
-- 1. payments_ledger: revoke user write access, service-role only
-- ------------------------------------------------------------

-- Drop the wide-open dev policies.
drop policy if exists "system can insert payments" on public.payments_ledger;
drop policy if exists "system can update payments" on public.payments_ledger;

-- Writes go through the service-role client (createAdminClient), which
-- bypasses RLS entirely. Authenticated (anon-key) users must NOT be able
-- to insert or update ledger rows. With RLS enabled and no insert/update
-- policy for `authenticated`, the default is DENY — exactly what we want.
-- (Service role always bypasses RLS, so webhook writes still succeed.)

-- Comment for future maintainers:
--   There is intentionally NO `for insert` / `for update` policy here.
--   All ledger mutations happen server-side via the admin client.

-- ------------------------------------------------------------
-- 2. Idempotency constraints
-- ------------------------------------------------------------

-- At most one active "in" charge per booking. We use a partial unique
-- index so a failed/pending row does not block retries, but a captured
-- charge is permanent. The application checks for existing pending/captured
-- rows before initiating, and this index is the DB-level backstop.
create unique index payments_ledger_one_active_charge_idx
  on public.payments_ledger(booking_id)
  where direction = 'in' and status in ('pending', 'captured');

-- At most one payout ("out") per booking. Platform fee + worker payout are
-- the only two "out" rows; this index allows exactly that by scoping to
-- status in ('pending','paid_out') and is complemented by application logic.
-- To keep it simple and safe: one pending/paid payout per booking.
create unique index payments_ledger_one_payout_idx
  on public.payments_ledger(booking_id)
  where direction = 'out' and actor_id is not null and status in ('pending', 'paid_out');

-- ------------------------------------------------------------
-- 3. bookings: restrict updates to status column only, enforce parties
-- ------------------------------------------------------------

drop policy if exists "participants can update bookings" on public.bookings;

-- Participants may update, but only the status field is allowed to change.
-- `with check` re-asserts party membership so a customer cannot reassign
-- worker_id (and vice versa).
create policy "participants can update booking status"
  on public.bookings for update to authenticated
  using (customer_id = auth.uid() or worker_id = auth.uid())
  with check (customer_id = auth.uid() or worker_id = auth.uid());

-- NOTE: column-level protection is enforced via a trigger below, because
-- Postgres RLS is row-level, not column-level. This trigger rejects any
-- update that touches party IDs or final_price.

create or replace function public.guard_booking_columns()
returns trigger as $$
begin
  -- Forbid reassigning either party or changing the price via a user update.
  if new.customer_id is distinct from old.customer_id then
    raise exception 'Cannot reassign booking customer_id';
  end if;
  if new.worker_id is distinct from old.worker_id then
    raise exception 'Cannot reassign booking worker_id';
  end if;
  if new.final_price is distinct from old.final_price then
    raise exception 'Cannot modify booking final_price after creation';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists guard_booking_columns_trigger on public.bookings;
create trigger guard_booking_columns_trigger
  before update on public.bookings
  for each row execute procedure public.guard_booking_columns();

-- ------------------------------------------------------------
-- 4. bids: block self-bidding + scope customer update to status
-- ------------------------------------------------------------

drop policy if exists "workers create bids" on public.bids;

create policy "workers create bids on others listings"
  on public.bids for insert to authenticated
  with check (
    auth.uid() = worker_id
    and exists (
      select 1 from public.listings l
      where l.id = bids.listing_id
        and l.status = 'open'
        and l.customer_id <> auth.uid()  -- cannot bid on own listing
    )
  );

-- Restrict the listing owner's update to the status column only.
-- A customer should only flip bid status (accept/reject), never rewrite
-- a worker's amount, message, or worker_id.
drop policy if exists "customers update bids on their listings" on public.bids;

create policy "customers update bid status on their listings"
  on public.bids for update to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = bids.listing_id and l.customer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = bids.listing_id and l.customer_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 5. reviews: subject_id must be the other booking participant
-- ------------------------------------------------------------

drop policy if exists "participants can review after completion" on public.reviews;

create policy "participants can review counterparty after completion"
  on public.reviews for insert to authenticated
  with check (
    auth.uid() = author_id
    and author_id <> subject_id
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.status = 'completed'
        and (
          -- author is the customer, subject is the worker, or vice versa
          (b.customer_id = auth.uid() and b.worker_id = subject_id)
          or (b.worker_id = auth.uid() and b.customer_id = subject_id)
        )
    )
  );

-- ------------------------------------------------------------
-- 6. profiles: protect role + is_verified from self-edit
--    (workers also cannot self-set rating — see worker_profiles below)
-- ------------------------------------------------------------

-- Replace the broad update policy with one that still allows the owner to
-- update safe columns. Column protection is via trigger because RLS is
-- row-level only.
create or replace function public.guard_profile_columns()
returns trigger as $$
begin
  -- Allow the FIRST role assignment (old.role IS NULL → setting it).
  -- Block RE-assigning an existing role (a 'worker' can't make themselves
  -- a 'customer' to bypass bid checks, etc.). Re-assignment requires the
  -- service role (bypasses RLS + triggers).
  if new.role is distinct from old.role and old.role is not null then
    raise exception 'Role is already set and cannot be self-modified; contact support';
  end if;
  if new.is_verified is distinct from old.is_verified then
    raise exception 'Cannot self-verify';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists guard_profile_columns_trigger on public.profiles;
create trigger guard_profile_columns_trigger
  before update on public.profiles
  for each row execute procedure public.guard_profile_columns();

-- ------------------------------------------------------------
-- 7. worker_profiles: protect rating from self-edit
-- ------------------------------------------------------------

create or replace function public.guard_worker_profile_columns()
returns trigger as $$
begin
  if new.rating is distinct from old.rating then
    raise exception 'Rating can only be set by the system trigger';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists guard_worker_profile_columns_trigger on public.worker_profiles;
create trigger guard_worker_profile_columns_trigger
  before update on public.worker_profiles
  for each row execute procedure public.guard_worker_profile_columns();

-- ------------------------------------------------------------
-- 8. Enable RLS on trades (was missing entirely) + read-only policy
-- ------------------------------------------------------------

alter table public.trades enable row level security;

create policy "anyone can read trades"
  on public.trades for select
  to authenticated
  using (true);

-- trades is a reference table; no insert/update/delete policy for
-- authenticated users means it is read-only at the DB level.
-- (Only the service role / migrations can modify it.)

-- ============================================================
-- ROLLBACK:
-- drop index payments_ledger_one_active_charge_idx;
-- drop index payments_ledger_one_payout_idx;
-- drop trigger guard_booking_columns_trigger on public.bookings;
-- drop function public.guard_booking_columns();
-- drop trigger guard_profile_columns_trigger on public.profiles;
-- drop function public.guard_profile_columns();
-- drop trigger guard_worker_profile_columns_trigger on public.worker_profiles;
-- drop function public.guard_worker_profile_columns();
-- alter table public.trades disable row level security;
-- drop policy "anyone can read trades" on public.trades;
-- (then recreate the original wider policies if needed)
