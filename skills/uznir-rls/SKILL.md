# Skill: uznir-rls

Write and review Supabase Row Level Security policies for the Uznir marketplace, following the security patterns defined in AGENTS.md and docs/architecture.md.

## Trigger

Use this skill when the user asks to add RLS policies, fix a security issue related to data access, or create a new database table that needs row-level security.

## Core principle

**RLS is the security model.** Every table has RLS enabled. The Supabase client runs as the authenticated user. There is no service-role key on the client side.

## The marketplace patterns

### Pattern 1: Own data only

Use when a row belongs to one user (profiles, worker_profiles).

```sql
alter table <table> enable row level security;

create policy "users see own data"
  on <table> for select
  to authenticated
  using (user_id_column = auth.uid());

create policy "users update own data"
  on <table> for update
  to authenticated
  using (user_id_column = auth.uid())
  with check (user_id_column = auth.uid());
```

### Pattern 2: Participant-OR (the critical marketplace pattern)

Use when a row involves two parties (bookings, messages). A user is ONE side — never both.

```sql
-- CORRECT: OR — user is customer OR worker
create policy "participants can read"
  on <table> for select
  to authenticated
  using (
    exists (
      select 1 from bookings b
      where b.id = <table>.booking_id
        and (b.customer_id = auth.uid() or b.worker_id = auth.uid())
    )
  );

-- WRONG: AND — requires user to be BOTH customer AND worker (never true)
-- This is the most common RLS bug in marketplace apps!
```

### Pattern 3: Role-based visibility (listings, bids)

Use when one role creates and the other role consumes.

```sql
-- Listings: customers see their own, workers see open listings
create policy "listings visibility"
  on listings for select
  to authenticated
  using (
    auth.uid() = customer_id           -- creator sees their own
    or status = 'open'                 -- workers see open jobs
    or exists (
      select 1 from bids b
      where b.listing_id = listings.id
        and b.worker_id = auth.uid()   -- workers see jobs they bid on
    )
  );
```

### Pattern 4: Public read, restricted write

Use when anyone authenticated can read but only the owner can modify.

```sql
create policy "authenticated users can read profiles"
  on profiles for select
  to authenticated
  using (true);  -- all authenticated users can read

create policy "users update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

### Pattern 5: Insert restrictions

Control who can create rows.

```sql
-- Only customers can create listings
create policy "customers can create listings"
  on listings for insert
  to authenticated
  with check (
    auth.uid() = customer_id
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and (p.role = 'customer' or p.role = 'both')
    )
  );
```

### Pattern 6: Status-guarded transitions

Prevent invalid status changes.

```sql
-- Only allow status transitions that make sense
create policy "valid status transitions"
  on bookings for update
  to authenticated
  using (
    -- customer can cancel if scheduled
    (auth.uid() = customer_id and status = 'scheduled' and (new).status = 'cancelled')
    -- customer can mark as in_progress
    or (auth.uid() = customer_id and status = 'scheduled' and (new).status = 'in_progress')
    -- either party can mark as completed (simplified)
    or ((auth.uid() = customer_id or auth.uid() = worker_id) and status = 'in_progress' and (new).status = 'completed')
  );
```

## Steps

1. Identify which tables need RLS (answer: all of them).
2. Determine the access pattern for each table (own-data, participant-OR, role-based, public-read).
3. Write the `enable row level security` statement.
4. Write SELECT, INSERT, UPDATE, DELETE policies for each table.
5. Check: does every policy use `auth.uid()` correctly? Is the participant pattern using OR not AND?
6. Add the policies to the appropriate migration file.
7. Test: write test cases for each policy scenario.

## Testing RLS

After applying migrations, test with Supabase SQL Editor:

```sql
-- Test as a specific user
set request.jwt.claim.sub = '<user-uuid>';
set role authenticated;

-- This should return the user's own data
select * from profiles where id = '<user-uuid>';

-- This should return empty (can't see others' private data)
select * from profiles where id != '<user-uuid>' and ...;
```

## Checklist for every policy

- [ ] RLS enabled on the table
- [ ] Uses `auth.uid()` (not `current_user` or hardcoded IDs)
- [ ] Participant pattern uses OR, not AND
- [ ] INSERT has a `with check` clause
- [ ] UPDATE has both `using` and `with check`
- [ ] No policy allows unauthenticated access unless intentional
- [ ] Tested with `set request.jwt.claim.sub` in Supabase SQL Editor
