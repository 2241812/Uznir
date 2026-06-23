# Uznir — AI Agent Notes

> This file gives quick orientation to AI agents. For full rules, read **AGENTS.md**. For project state and next steps, read **docs/AGENT-HANDOFF.md**.

## Start here

1. **docs/AGENT-HANDOFF.md** — what's done, what's next, how to run. Read this first.
2. **AGENTS.md** — coding rules, architecture, conventions. The authoritative manual.
3. **docs/architecture.md** — full technical design (stack, RLS, geo, payments, PWA).

## Quick facts

- **Project:** Uznir — PH-first, international-ready two-sided marketplace PWA (Next.js 15 + React 19 + TypeScript strict + Supabase + Serwist)
- **State:** M0 Foundation complete. `npm run build` passes (19 routes). Ready for Supabase linking and M1 core-loop work.
- **Node:** 20+ (`nvm use` or check `.nvmrc`)
- **Package manager:** npm
- **Build:** `npm install && npm run build` should succeed out of the box

## Critical conventions (don't break these)

- Server Components by default; `'use client'` only when needed
- Mutations via Server Actions, not API routes (except webhooks)
- RLS on every table — participant-OR pattern
- Payments through `getGateway()` adapter, never import providers directly
- i18n via `t()`, currency via `Intl.NumberFormat`, imports via `@/`

## Agentic Engineering workflow

This project uses a **spec-first, verify-rigorously, review-mandatory** approach. Every change follows this cycle:

1. **Spec** — Write requirements first using the structured template
2. **Generate** — Implement against the spec, reading existing patterns
3. **Review** — Check against the review checklist (5 dimensions)
4. **Refine** — Surgical fixes, preserve working portions

## Before you make changes

1. Read **AGENTS.md** fully.
2. Load **`uznir-agentic-prompt`** skill first — it provides the spec template, review checklist, and ties together all other skills.
3. Check the relevant domain skill in `skills/` (uznir-feature, uznir-rls, uznir-db-migration, uznir-i18n).
4. Run `npm run type-check` and `npm run build` to verify existing code compiles before you start.
