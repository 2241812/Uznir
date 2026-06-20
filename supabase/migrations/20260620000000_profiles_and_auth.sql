-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- ============================================================
-- Profiles: 1:1 with auth.users
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null check (role in ('customer', 'worker', 'both')) default 'customer',
  phone text,
  is_verified boolean default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        split_part(new.email, '@', 1)
      )
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ROLLBACK:
-- drop trigger on_auth_user_created on auth.users;
-- drop function public.handle_new_user();
-- drop table public.profiles;
