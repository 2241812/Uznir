# Skill: uznir-db-migration

Create reversible, well-structured Supabase database migrations for the Uznir marketplace.

## Trigger

Use this skill when the user asks to make database changes — add tables, modify columns, create indexes, add RLS policies, create functions/RPCs, or seed data.

## Migration conventions

### File naming

Migrations are timestamped automatically by the Supabase CLI:
```bash
npm run db:generate "add worker portfolio table"
# Creates: supabase/migrations/YYYYMMDDHHMMSS_add_worker_portfolio_table.sql
```

### Structure

Every migration file should follow this order:

1. **Comments** — What does this migration do and why?
2. **DDL (CREATE/ALTER/DROP)** — Schema changes.
3. **RLS policies** — If creating or modifying tables, include all RLS policies.
4. **Indexes** — For new columns used in queries.
5. **Functions/RPCs** — If adding new Postgres functions.
6. **Seed data** — Reference data (trades, settings). Do NOT put test data here.
7. **Rollback** — Commented `-- ROLLBACK` section at the bottom showing how to undo.

### Example

```sql
-- Add worker portfolio table for showcasing work photos and past jobs.
-- References: docs/data-model.md, docs/architecture.md (RLS section)

create table public.worker_portfolios (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  photos_url text[] not null default '{}',  -- Supabase Storage URLs
  is_featured boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table public.worker_portfolios enable row level security;

create policy "workers can read all portfolios"
  on public.worker_portfolios for select
  to authenticated
  using (true);

create policy "workers can insert own portfolio"
  on public.worker_portfolios for insert
  to authenticated
  with check (
    worker_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.role = 'worker' or p.role = 'both')
    )
  );

create policy "workers can update own portfolio"
  on public.worker_portfolios for update
  to authenticated
  using (worker_id = auth.uid())
  with check (worker_id = auth.uid());

create policy "workers can delete own portfolio"
  on public.worker_portfolios for delete
  to authenticated
  using (worker_id = auth.uid());

-- Index
create index worker_portfolios_worker_id_idx on public.worker_portfolios(worker_id);

-- ROLLBACK:
-- drop table public.worker_portfolios;
```

## Rules

1. **Always use the `public` schema explicitly** in migrations (Supabase convention).
2. **Every new or modified table gets RLS enabled and policies written.** No exceptions.
3. **Foreign keys use `on delete cascade`** for dependent tables (messages → bookings, bids → listings, worker_profiles → profiles).
4. **UUIDs** use `gen_random_uuid()` as the default for primary keys.
5. **Timestamps** use `timestamptz default now()`.
6. **Monetary values** use `numeric(10,2)` — never `float` or `double precision`.
7. **Booleans** use `boolean default false` (not nullable unless intentional).
8. **Enums** are `text` with CHECK constraints (easier to alter than native enums):
   ```sql
   status text not null default 'open'
     check (status in ('open', 'awarded', 'in_progress', 'done', 'cancelled'))
   ```
9. **Never modify existing migration files** that have been pushed to production. Create a new migration to alter.
10. **Seed reference data** (trades list, default settings) goes in `supabase/seed.sql`. Test data goes in a separate `supabase/seed.test.sql` (gitignored).

## Commands

```bash
# Create new migration
npm run db:generate "description"

# Apply pending migrations
npm run db:push

# Reset DB (drop + reapply all migrations + seed) — dev only
npm run db:reset

# Regenerate TypeScript types
npm run db:types
```

## After migration

1. Push the migration: `npm run db:push`
2. Regenerate types: `npm run db:types`
3. Update `docs/data-model.md` if schema changed
4. Update `AGENTS.md` if new conventions were introduced
