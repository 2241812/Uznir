# Skill: uznir-feature

Scaffold a new feature end-to-end in the Uznir marketplace, following project conventions defined in AGENTS.md.

## Trigger

Use this skill when the user asks to add a new feature to Uznir — e.g. "add a cancellation flow", "add a worker portfolio page", "add notification preferences".

## What this skill does

Creates the full vertical slice for a feature: database migration → RLS policies → zod validation → Server Actions → page/component → navigation link. Follows the conventions in AGENTS.md.

## Steps

### 1. Understand the feature
- Ask the user what the feature does, which roles it affects (customer, worker, both), and what data it needs.
- If unclear, propose a reasonable design based on the data model in docs/data-model.md.

### 2. Database changes
- If the feature needs new tables or columns, create a migration:
  ```bash
  npm run db:generate "add <feature description>"
  ```
- Write the SQL in the generated migration file.
- **Always include RLS policies** for any new or modified tables. Follow the patterns in AGENTS.md and docs/architecture.md.
- If the feature needs a new RPC, write it in the same migration.
- Run `npm run db:types` to regenerate TypeScript types after pushing.

### 3. Validation schemas
- Create or update zod schemas in `lib/validation/`.
- Use the same schema for client-side form validation and server-side Server Action validation.
- Export the TypeScript type from the zod schema: `type CreateFooInput = z.infer<typeof createFooSchema>`.

### 4. Server Actions
- Create Server Actions in the appropriate location:
  - Mutations on `app/(app)/(shared)/` or `lib/actions/`.
  - Use `lib/supabase/server.ts` for the Supabase client.
  - Validate input with the zod schema.
  - Return `{ success: boolean, error?: string, data?: T }`.

### 5. Pages and components
- Add the page in the appropriate route group:
  - Customer-only: `app/(app)/(customer)/`
  - Worker-only: `app/(app)/(worker)/`
  - Both roles: `app/(app)/(shared)/`
- Create feature components in `components/features/<feature-name>/`.
- Use shadcn/ui components from `components/ui/`.
- Default to Server Components. Add `'use client'` only when needed.

### 6. Navigation
- Add a link to the feature page in the appropriate layout's navigation:
  - Customer nav: `app/(app)/(customer)/layout.tsx`
  - Worker nav: `app/(app)/(worker)/layout.tsx`
  - Shared nav: `app/(app)/layout.tsx`

### 7. i18n
- Add any new UI strings to `lib/i18n/strings/en.ts` and `lib/i18n/strings/fil.ts`.
- Use the `t()` helper from `lib/i18n/index.ts`.

### 8. Documentation
- Update AGENTS.md if the feature introduces new conventions.
- Update docs/data-model.md if the schema changed.
- Update docs/roadmap.md to mark the feature as done.

## Example

User: "Add a job cancellation flow"

1. Migration: add `cancelled_at timestamptz` and `cancellation_reason text` to `bookings`. Add RLS for update.
2. Validation: `cancelBookingSchema` in `lib/validation/bookings.ts`.
3. Server Action: `cancelBooking` in `app/(app)/(shared)/booking/actions.ts`.
4. Component: `CancelBookingButton` in `components/features/booking/`.
5. Page: Update `app/(app)/(shared)/booking/[id]/page.tsx` to include the cancel button.
6. i18n: Add "Cancel booking", "Reason for cancellation" strings.

## Constraints
- Never bypass RLS with service-role key on the client.
- Never hardcode currency symbols.
- Always use `@/` import alias.
- Always validate with zod on both client and server.
