# TEAM.md — Uznir Multi-Role Operating Model

> This document defines how the Uznir project is run as a structured team.
> It assigns three roles — **CEO Agent**, **Engineering Manager (EM)**, and
> **QA Tester** — and tells each role exactly what to do, what to check,
> and what to escalate to the human (you).
>
> Read this alongside `AGENTS.md` (coding manual) and `docs/AGENT-HANDOFF.md`
> (current state).

---

## Why a multi-role setup?

A single "agent" that writes, reviews, and ships its own code has no quality
gate. The previous agents shipped a marketplace with the core loop wired but
**critical security holes** (any user could forge payment records, accept
their own bids, manipulate ratings) because nothing checked the work against
intent. This structure forces separation of concerns:

- **CEO** decides *what* matters (priorities, acceptance criteria, risk)
- **EM** decides *how* it's built (architecture, code review, refactors)
- **QA** decides *whether* it ships (tests, edge cases, security, verification)

Every feature goes through all three before it's marked done.

---

## Role 1 — CEO Agent

**Owns:** priorities, scope, acceptance criteria, risk triage, status reporting.

### Responsibilities
- Translate user objectives into a concrete prioritized backlog.
- Decide which milestone's deliverables are in-scope for the current sprint.
- Define acceptance criteria for each feature BEFORE work starts.
- Triage audit findings (Critical / High / Medium / Low) and order fixes.
- Maintain `docs/AGENT-HANDOFF.md` and `docs/roadmap.md` checkboxes.
- Report status to the human at decision points, not after every commit.

### What the CEO does NOT do
- Write code (delegates to EM).
- Approve its own work (QA verifies).

### CEO decision log
Maintain a dated log of priority calls. Example:

```
2026-06-21 — P0: fix payment forge + self-deal RLS holes (audit found)
2026-06-21 — P1: wire auth pages (was blocking all runtime testing)
2026-06-21 — P2: public worker profile page (M2 next feature)
```

### Acceptance criteria template
For every feature, the CEO writes:
```
Feature: <name>
Done when:
- [ ] <observable behavior 1>
- [ ] <observable behavior 2>
- [ ] EM code review passed (no Critical/High findings)
- [ ] QA verification passed (tests or manual checklist green)
- [ ] build + type-check + lint green
```

---

## Role 2 — Engineering Manager (EM)

**Owns:** architecture, code quality, code review, technical debt, migrations.

### Responsibilities
- Implement features the CEO prioritizes.
- Enforce `AGENTS.md` rules (Server Components by default, RLS on every table,
  Server Actions for mutations, `@/` imports, payments through `getGateway()`).
- Review EVERY change before it's committed — including their own.
- Maintain a migration log in `supabase/migrations/` (append-only, timestamped).
- Track technical debt and flag it to the CEO.

### EM code-review checklist (run on every change)
- [ ] **Auth**: every mutation action calls `getUser()` and verifies ownership.
- [ ] **RLS**: every new table has `for select/insert/update/delete` policies.
- [ ] **Atomicity**: multi-table writes either use a transaction or order
      operations so partial failures are recoverable.
- [ ] **Idempotency**: payment/bid/booking mutations can be retried safely.
- [ ] **No service role in client**: `lib/supabase/admin.ts` is never imported
      from a `"use client"` file or shipped to the browser.
- [ ] **Validation**: zod schema in `lib/validation/` on both client and server.
- [ ] **revalidatePath**: mutations refresh the cache so the UI updates.
- [ ] **Type-safety**: no `any`, no unchecked `as` casts without justification.
- [ ] **i18n**: no hardcoded currency symbols; UI strings in dictionaries.

### EM escalation rules
- If a security-critical bug is found → STOP feature work, fix immediately,
  notify CEO + QA.
- If a change requires a schema migration → write the migration, do not edit
  existing migrations.
- If a pattern in `AGENTS.md` doesn't fit the task → escalate to human, don't
  silently break the rule.

---

## Role 3 — QA Tester

**Owns:** verification, testing, security review, edge-case hunting.

### Responsibilities
- Verify every acceptance criterion against real evidence (not assertions).
- Run security audits on RLS policies and server actions (the kind that found
  this sprint's critical bugs).
- Write tests (currently zero exist — this is P0 debt).
- Maintain the completion audit checklist for the session objective.

### QA verification checklist (run before marking anything done)
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes (all routes compile)
- [ ] Migration applies cleanly (`supabase db push` — needs linked Supabase)
- [ ] **Negative-path test**: can a non-owner do X? (verify RLS blocks it)
- [ ] **Idempotency test**: call the action twice — does the second fail gracefully?
- [ ] **Concurrent test**: two accepts on one listing — only one booking created?
- [ ] **Payment integrity**: webhook with wrong amount — rejected/logged?

### QA red-flag list (immediate blockers if found)
- Any `payments_ledger` policy with `with check (true)` for authenticated.
- Any action that mutates without calling `getUser()`.
- Any service-role key referenced from client code.
- Any booking transition with no role/authorization check.
- Any webhook that trusts its payload without signature verification.

### QA audit cadence
- Full RLS audit: once per milestone or before any payment-touching change.
- Server-action audit: every time `lib/actions/` changes.
- Webhook audit: every time `app/api/` or `lib/payments/` changes.

---

## How a feature flows through the team

```
Human objective
      ↓
CEO defines acceptance criteria + priority
      ↓
EM implements + self-reviews against checklist
      ↓
QA verifies against acceptance criteria + security checklist
      ↓
   ┌─ PASS → commit, update handoff, report to human
   └─ FAIL → back to EM with specific findings
```

---

## What the human (you) owns

These are decisions only you can make. The agents will ask for input at these
points rather than guessing.

### Strategic decisions (CEO needs these)
1. **Which milestone is next?** M2 (trust/reputation) vs. runtime verification
   (link Supabase + manual smoke test) vs. M3 (search). The code is
   code-complete for M1+auth but never run.
2. **Scope of each sprint.** How many features per session before you review.
3. **When to deploy.** The app has never run against a real backend.

### Credentials / external accounts (EM needs these to test at all)
4. **Supabase project.** Create one at supabase.com, then provide:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for the webhook admin client — REQUIRED now)
5. **Run `supabase link --project-ref <ref>` + `npm run db:push`** to apply all
   9 migrations, then `npm run db:types` to replace the hand-written types.
6. **Google OAuth** (optional but the buttons exist): create credentials in
   Google Cloud Console, add to Supabase Auth providers.
7. **Xendit account** (optional for now): get `XENDIT_SECRET_KEY` +
   `XENDIT_WEBHOOK_SECRET` when ready for live payment testing.

### Human-in-the-loop verification (QA needs these)
8. **Manual smoke test** once Supabase is linked — the full loop:
   signup → role-select → post job → bid → accept → chat → pay → complete →
   review. You are the only one who can confirm the UI actually works.
9. **Confirm direction** after each critical bug fix — the security changes
   altered RLS behavior; you should know that happened.

---

## Current sprint status (as of this session)

| Item | Status | Owner |
|---|---|---|
| Auth pages wired (login/signup/callback) | ✅ Done | EM |
| Critical RLS holes fixed (payments/bookings/bids/reviews/profiles) | ✅ Done | EM |
| acceptBid atomicity + idempotency | ✅ Done | EM |
| processPayout authorization + capture check | ✅ Done | EM |
| Webhook uses admin client + amount validation | ✅ Done | EM |
| Booking role separation (worker completes, customer cancels) | ✅ Done | EM |
| Webhook signature hardening (Xendit empty-secret, PayMongo HMAC) | ✅ Done | EM |
| build + type-check + lint green | ✅ Done | QA |
| Supabase linked + types regenerated | ⏳ Blocked on human | Human |
| First end-to-end runtime smoke test | ⏳ Blocked on human | Human + QA |
| Test suite (Vitest) set up | ❌ Not started | QA |
| M2 public worker profile page | ❌ Not started | EM |

---

## How to give feedback

When you respond, you can reference any role directly:
- **"CEO: prioritize X"** — I'll update the backlog and acceptance criteria.
- **"EM: review the auth flow"** — I'll run the code-review checklist on it.
- **"QA: audit the payments path again"** — I'll run a fresh security pass.
- **"All: continue"** — I'll proceed with the current plan.

If something looks wrong, say so — the whole point of this structure is that
mistakes get caught before they ship.
