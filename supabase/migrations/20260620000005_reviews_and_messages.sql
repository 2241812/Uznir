-- ============================================================
-- Reviews: One per side per booking
-- ============================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  unique (booking_id, author_id)
);

create index reviews_booking_id_idx on public.reviews(booking_id);
create index reviews_subject_id_idx on public.reviews(subject_id);

-- RLS
alter table public.reviews enable row level security;

create policy "booking participants can read reviews"
  on public.reviews for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and (b.customer_id = auth.uid() or b.worker_id = auth.uid())
    )
  );

create policy "participants can review after completion"
  on public.reviews for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and author_id != subject_id
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.status = 'completed'
        and (b.customer_id = auth.uid() or b.worker_id = auth.uid())
    )
  );

-- ============================================================
-- Messages: Chat between booking participants
-- Uses the participant-OR pattern (critical marketplace RLS)
-- ============================================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_booking_id_idx on public.messages(booking_id);
create index messages_sender_id_idx on public.messages(sender_id);
create index messages_created_at_idx on public.messages(created_at desc);

-- RLS (participant-OR pattern)
alter table public.messages enable row level security;

create policy "messages between booking participants"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (b.customer_id = auth.uid() or b.worker_id = auth.uid())
    )
  );

create policy "participants can insert messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (b.customer_id = auth.uid() or b.worker_id = auth.uid())
    )
  );

-- ROLLBACK:
-- drop table public.messages;
-- drop table public.reviews;
