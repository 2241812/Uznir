# Skill: uznir-agentic-prompt

Master orchestrator for working on the Uznir marketplace with Agentic Engineering discipline. **Load this skill FIRST** before starting any work on this project. It ties together all existing Uznir skills and enforces the spec-first, verify-rigorously, review-mandatory workflow.

## When to use

**Always.** Every prompt to an AI agent working on Uznir — whether implementing a feature, fixing a bug, refactoring, or adding infrastructure — goes through this structured spec format.

## Dependencies

This skill references and expects you to have loaded or be aware of:

| Resource | Where | What it gives you |
|---|---|---|
| `spec-driven-build` | User-level skill | Generic spec-first workflow foundation |
| `AGENTS.md` | `/AGENTS.md` | Architecture rules, file conventions, common commands |
| `CLAUDE.md` | `/CLAUDE.md` | Quick orientation, what to read first |
| `AGENT-HANDOFF.md` | `/docs/AGENT-HANDOFF.md` | Project state, what's done, what's next |
| `uznir-feature` | `skills/uznir-feature/` | Feature scaffolding steps (migration → RLS → validation → action → page → nav → i18n) |
| `uznir-db-migration` | `skills/uznir-db-migration/` | Database migration conventions and patterns |
| `uznir-rls` | `skills/uznir-rls/` | Row Level Security patterns (participant-OR, role-based, status-guarded) |
| `uznir-i18n` | `skills/uznir-i18n/` | i18n string patterns (en + fil) |

---

## Pre-Flight Checklist

Before you write a single line of code, you MUST have done this:

- [ ] Read **AGENTS.md** fully — it defines the non-negotiable rules
- [ ] Read **CLAUDE.md** for quick orientation
- [ ] Read **AGENT-HANDOFF.md** to understand project state and what's already done
- [ ] Read the relevant **uznir-\* skill** for your domain (feature, migration, RLS, i18n)
- [ ] Read **existing pattern files** for the area you're changing (reference at least 2 existing similar files)
- [ ] Written the **spec** using the template below — no code without an agreed spec
- [ ] Verified the spec covers: happy path, edge cases, error states, loading states, empty states
- [ ] Verified the spec is **one atomic, reviewable task** — if it touches 5+ files or 3+ layers, decompose

---

## Prompt Template (Spec)

Every prompt to implement something on Uznir MUST follow this structure. Fill in each section.

```markdown
## Context
<!-- What are we building, why, which phase (M0-M5), which role (customer/worker/both)? -->

## Existing files to read
<!-- File paths the agent must read for patterns. Be specific. -->

## Requirements
- [ ] Requirement 1 (atomic, testable)
- [ ] Requirement 2
- [ ] Edge case 1
- [ ] Error state handling

## Constraints (Uznir-specific — do not skip)
- **Server Components by default** — 'use client' only for interactivity, browser APIs, or hooks
- **Mutations via Server Actions** — not API routes (except webhooks). Validate with zod on both sides
- **RLS on every table** — participant-OR pattern for marketplace data. Never bypass RLS with service role on client
- **Payments through adapter** — `getGateway()` from `@/lib/payments`, never import xendit/paymongo directly
- **i18n through t()** — never hardcode UI strings. Add to both en.ts and fil.ts
- **Currency via Intl.NumberFormat** — never hardcode ₱ or $. Store as numeric(10,2)
- **Import alias @/** — no relative imports crossing packages
- **TypeScript strict** — no `any`, no `@ts-ignore`, no `@ts-expect-error`

## Design decisions to follow
<!-- Reference specific files that show the pattern. Examples:
- Form pattern: `app/(app)/(customer)/post-job/PostJobForm.tsx`
- Server Action pattern: `lib/actions/listings.ts`
- Page pattern: `app/(app)/(shared)/job/[id]/page.tsx`
-->

## Deliverables
<!-- List each file to create or modify, with one-line description of what it does. -->

## Verification
<!-- Commands to run before declaring done. At minimum: -->
- [ ] `lsp_diagnostics` clean on all changed files
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
```

---

## Agent Response Protocol

When you receive a properly structured spec, your response MUST follow this order:

### 1. Acknowledge and read
- Confirm the spec is complete enough to start
- If anything is ambiguous, ask ONE clarifying question (don't guess)
- Read each file listed in "Existing files to read"

### 2. Plan before code
- Write a brief implementation plan: which files in which order, what pattern you'll follow
- State which of the uznir-* skills apply to this task

### 3. Implement
- **Test-first if modifying existing behavior** (characterization tests for refactors, RED→GREEN for new features)
- One atomic change per step
- After each file change, run `lsp_diagnostics` on it

### 4. Verify
- Run ALL commands listed in the Verification section
- Handle any failures — do NOT report done with failing checks
- Confirm each acceptance criterion is met

### 5. Report
- Brief summary: what was created/modified, what was verified, any unexpected findings
- Full diff reference

---

## Review Checklist (Pre-Merge Gate)

Before declaring ANY work on Uznir complete, go through this checklist:

### Correctness
- [ ] Every acceptance criterion from the spec is met
- [ ] Edge cases handled (empty state, error state, boundary values)
- [ ] Loading state shown for async operations
- [ ] Form validation shows clear error messages (zod + react-hook-form)
- [ ] Server Action returns `{ success: boolean, error?: string, data?: T }` format

### Security (RLS)
- [ ] New tables have RLS enabled
- [ ] Participant-OR pattern uses OR, not AND (this is the #1 marketplace RLS bug)
- [ ] No `supabase.auth.getUser()` bypass that could allow data leaks
- [ ] No service role key on the client side
- [ ] Server Actions validate with zod before touching the database
- [ ] Webhook endpoint validates signature from payment provider

### Architecture
- [ ] Server Component unless 'use client' is justified
- [ ] Mutation uses Server Action, not an API route (unless it's a webhook)
- [ ] Payment logic goes through `getGateway()`, not direct import
- [ ] UI strings use `t()` helper, not hardcoded text
- [ ] Currency uses `Intl.NumberFormat`, not hardcoded symbols
- [ ] Imports use `@/` alias, not relative paths

### Maintainability
- [ ] Follows existing naming conventions (PascalCase components, camelCase utilities/actions)
- [ ] Uses shadcn/ui components from `components/ui/` rather than raw HTML
- [ ] No dead code, commented-out code, or console.log
- [ ] Error messages are user-friendly (not raw error objects)
- [ ] File placed in correct route group (`(customer)`, `(worker)`, `(shared)`, or `(marketing)`)

### Build Health
- [ ] `lsp_diagnostics` clean on changed files
- [ ] `npm run type-check` exit 0
- [ ] `npm run lint` exit 0
- [ ] `npm run build` exit 0 (22 routes compiled)

---

## Examples

### Example 1: New feature — Job cancellation

**Spec prompt:**

```markdown
## Context
M1 — Core loop. Customers need to cancel a booking before work starts. Both roles see cancellation status. This adds a cancellation flow to existing bookings.

## Existing files to read
- `lib/validation/booking.ts` — existing booking schemas
- `lib/actions/bookings.ts` — existing booking Server Actions
- `app/(app)/(shared)/booking/[id]/page.tsx` — booking detail page
- `app/(app)/(shared)/booking/[id]/BookingActions.tsx` — action buttons on booking

## Requirements
- [ ] Customer can cancel a booking if status is 'scheduled'
- [ ] Customer must provide a cancellation reason (text, required, 10-500 chars)
- [ ] Booking status changes to 'cancelled' with `cancelled_at` timestamp and `cancellation_reason` set
- [ ] Both parties see the cancellation reason on the booking detail page
- [ ] Worker cannot cancel (only customer)
- [ ] Cancelled bookings show "Cancelled" badge with reason text

## Constraints
(standard Uznir constraints — apply all)

## Design decisions to follow
- Form/validation: follow `lib/validation/booking.ts` pattern for zod schema
- Server Action: follow `lib/actions/bookings.ts` `updateBookingStatus` pattern
- UI: follow `BookingActions.tsx` button + dialog pattern
- RLS: update policy on bookings table — customer can update only if they own it AND status is 'scheduled'

## Deliverables
- `supabase/migrations/..._add_cancellation_to_bookings.sql` — add `cancelled_at timestamptz`, `cancellation_reason text` columns, update RLS
- `lib/validation/booking.ts` — add `cancelBookingSchema`
- `lib/actions/bookings.ts` — add `cancelBooking` Server Action
- `app/(app)/(shared)/booking/[id]/CancelBookingButton.tsx` — cancel button with reason dialog
- `app/(app)/(shared)/booking/[id]/page.tsx` — show cancellation reason if cancelled
- `lib/i18n/strings/en.ts` and `lib/i18n/strings/fil.ts` — add cancellation strings

## Verification
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] RLS policy tested: customer can cancel their own scheduled booking, worker cannot
- [ ] Server Action rejects cancellation on non-scheduled bookings
```

### Example 2: Database migration — Add worker portfolio table

**Spec prompt:**

```markdown
## Context
M2 — Trust & Reputation. Workers need to showcase past work with photos and descriptions. A new `worker_portfolios` table with Supabase Storage integration.

## Existing files to read
- `skills/uznir-db-migration/SKILL.md` — migration conventions
- `skills/uznir-rls/SKILL.md` — RLS patterns
- `supabase/migrations/20260620000001_trades_and_workers.sql` — existing worker schema
- `docs/data-model.md` — ER diagram, table conventions

## Requirements
- [ ] Workers can create portfolio entries with title, description, photo URLs, featured flag
- [ ] Each portfolio entry belongs to one worker (FK to profiles)
- [ ] Workers can have multiple portfolio entries
- [ ] All authenticated users can read portfolio entries (public profile)
- [ ] Only the owning worker can create/update/delete their entries
- [ ] Photos are stored in Supabase Storage bucket `worker-portfolios`, URLs stored in DB
- [ ] Featured entries (max 3 per worker) display prominently

## Deliverables
- Migration file with table + RLS + index
- Storage bucket creation SQL or setup doc
- Rollback section in migration

## Verification
- [ ] Migration file follows uznir-db-migration conventions
- [ ] RLS uses participant-OR where applicable, own-data pattern for portfolio
- [ ] Rollback SQL is valid
- [ ] `npm run db:types` would generate correct types from this schema
```

### Example 3: Server Action — Fix race condition in bid placement

**Spec prompt:**

```markdown
## Context
M1 — Core loop. Two workers should not be able to bid on a listing that's already been awarded. Currently, the `createBid` Server Action checks listing status but has a TOCTOU race condition.

## Existing files to read
- `lib/actions/bids.ts` — existing bid Server Action
- `lib/validation/bids.ts` — bid validation schema
- `supabase/migrations/20260620000003_bids.sql` — migrations (check for unique constraint)
- `supabase/migrations/20260621000001_secure_payments_and_bookings.sql` — security hardening patterns

## Requirements
- [ ] `createBid` must atomically check that listing status is 'open' before inserting
- [ ] Use DB-level constraint or `FOR UPDATE` row lock — not application-level check
- [ ] Return clear error message: "This job is no longer accepting bids"
- [ ] Existing tests (if any) still pass
- [ ] Duplicate bid attempts by same worker on same listing are rejected (unique constraint)

## Design decisions to follow
- Locking pattern: use `pg_try_advisory_xact_lock(listing_id)` or SELECT FOR UPDATE in a transaction
- Error pattern: follow `lib/actions/bookings.ts` error handling style

## Deliverables
- Update `lib/actions/bids.ts` — add atomicity to bid placement
- Migration (if needed) — add unique constraint on (listing_id, worker_id)

## Verification
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Two concurrent bid requests: exactly one succeeds
- [ ] Bid on awarded listing: rejected with clear error
```

---

## Quick Reference: Skills by Task Type

| Task type | Load this skill | Also reference |
|---|---|---|
| New feature | `uznir-agentic-prompt` + `uznir-feature` | `uznir-rls`, `uznir-i18n`, `uznir-db-migration` |
| Database migration | `uznir-agentic-prompt` + `uznir-db-migration` | `uznir-rls` |
| RLS policy | `uznir-agentic-prompt` + `uznir-rls` | `uznir-db-migration` |
| i18n / translations | `uznir-agentic-prompt` + `uznir-i18n` | — |
| Bug fix | `uznir-agentic-prompt` | Related uznir-* skill |
| Refactor | `uznir-agentic-prompt` | `spec-driven-build` |
| Code review | `uznir-agentic-prompt` | Review checklist (above) |

## Verification Protocol

**This is the FINAL gate before any task on Uznir is complete:**

1. ✅ `lsp_diagnostics` — clean on ALL changed files (no errors, no warnings beyond pre-existing)
2. ✅ `npm run type-check` — exit 0, zero type errors
3. ✅ `npm run lint` — exit 0, zero lint errors
4. ✅ `npm run build` — exit 0, all routes compile (expect 22 routes in M0/M1)
5. ✅ RLS review — every new/modified policy uses correct participant pattern
6. ✅ No type suppressions — zero `any`, `@ts-ignore`, `@ts-expect-error` in new code
7. ✅ No service role on client — `supabase.auth.getUser()` used, not `supabase.from(...)` with service key
8. ✅ No hardcoded strings — all UI text uses `t()`
9. ✅ No hardcoded currency — uses `Intl.NumberFormat`

If any check fails, FIX IT before reporting done. Not "noted for later" — fixed now.
