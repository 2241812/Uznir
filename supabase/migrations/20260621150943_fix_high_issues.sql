-- Fix PAY-3: Allow service_role to update final_price by bypassing guard_booking_columns
create or replace function public.guard_booking_columns()
returns trigger as $$
begin
  -- Only restrict authenticated users (allow service_role / webhooks to bypass)
  if auth.role() = 'authenticated' then
    if new.customer_id is distinct from old.customer_id then
      raise exception 'Cannot reassign booking customer_id';
    end if;
    if new.worker_id is distinct from old.worker_id then
      raise exception 'Cannot reassign booking worker_id';
    end if;
    if new.final_price is distinct from old.final_price then
      raise exception 'Cannot modify booking final_price after creation';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Fix PAY-6: bookings INSERT Policy Allows Workers to Create Bookings Unilaterally
drop policy if exists "participants can insert bookings" on public.bookings;
create policy "customers can insert bookings"
  on public.bookings for insert
  to authenticated
  with check (customer_id = auth.uid());

-- Fix PAY-7: bookings.listing_id FK Missing ON DELETE Behavior
alter table public.bookings
  drop constraint if exists bookings_listing_id_fkey,
  add constraint bookings_listing_id_fkey foreign key (listing_id)
    references public.listings(id) on delete set null;
