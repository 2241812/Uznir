# Agent Handoff — Uznir Project

> Read this first if you're an AI coding agent (opencode, Claude Code, Cursor, ZCode, etc.) picking up this project. Then read AGENTS.md for the coding manual.

## Project overview

**Uznir** ("Who's near?") — A PH-first, international-ready two-sided marketplace PWA connecting customers with local freelancers (drivers, carpenters, plumbers, electricians, couriers, cleaners, handymen).

- **GitHub:** https://github.com/2241812/Uznir
- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind v4 + Supabase + Serwist (PWA)
- **Platform:** Web (PWA) now, React Native later
- **Node:** 20+ (see `.nvmrc`)

## Current state — M1 Core Loop is COMPLETE ✅

The full marketplace transaction loop is wired end-to-end: post job → bid → award → chat → pay → complete → review. The build passes cleanly: `npm run build` → ✓ 22 routes compiled.

### What's done

| Area | Status | Details |
|---|---|---|
| Project scaffold | ✅ Done | package.json, tsconfig, postcss, next.config with Serwist |
| Git repo | ✅ Done | Pushed to https://github.com/2241812/Uznir (main branch) |
| Documentation | ✅ Done | README, AGENTS.md, architecture.md, data-model.md, payments.md, roadmap.md, deployment.md, CONTRIBUTING.md, **this handoff doc** |
| Custom skills | ✅ Done | skills/uznir-feature, uznir-rls, uznir-db-migration, uznir-i18n |
| Supabase lib | ✅ Done | client.ts, server.ts, middleware.ts, types.ts (hand-written — replace with `db:types` output after linking) |
| Payments lib | ✅ Done | Gateway interface, Xendit + PayMongo adapters, factory, commission helpers |
| i18n | ✅ Done | en.ts, fil.ts dictionaries, t() helper with fallback, resolveLocale() |
| Validation | ✅ Done | zod schemas for profiles, listings, bids, bookings, reviews, messages |
| Geo utils | ✅ Done | getUserLocation(), haversineDistance(), RADIUS_OPTIONS |
| DB migrations | ✅ Done | 8 migrations: profiles+auth, trades+workers, listings, bids, bookings, reviews+messages, payments_ledger, PostGIS RPC+FTS |
| Seed data | ✅ Done | 12 trade categories (mirrored in lib/trades.ts) |
| App shell | ✅ Done | Root, marketing, auth, (app) layouts with sidebar + mobile bottom nav |
| Pages (22) | ✅ Done | All route groups populated with real data queries |
| shadcn components | ✅ Done | Button, Input, Card, Label, Badge, Select, Skeleton |
| PWA | ✅ Done | manifest.ts, sw.ts (Serwist v9), offline.html, all icons generated |
| Webhook handler | ✅ Done | Xendit webhook at /api/webhooks/xendit |
| **Server Actions (7)** | ✅ **Done** | listings, bids, bookings, messages, profiles, reviews, payments |
| **Core loop UI** | ✅ **Done** | post-job, find-work, job detail (bids), chat (realtime), booking lifecycle, payment |
| **Dashboards** | ✅ **Done** | dashboard (live stats), my-jobs (bid counts), my-bids (earnings) |
| **Auth role select** | ✅ **Done** | role-select after signup + role switcher in profile |
| **Profile editor** | ✅ **Done** | basic info + worker profile (bio, rate, availability, trades) |
| **Reviews (M2 started)** | ✅ **Partial** | StarRating component + ReviewForm on completed bookings + rating display |
| **Build** | ✅ **PASSES** | `npm run build` → ✓ 22 routes, type-check + lint clean |

### Build output reference

```
Route (app)                              Size     First Load JS
┌ ƒ /                                    166 B           107 kB
├ ○ /home, /about, /pricing              static
├ ○ /login, /signup, /role-select        static
├ ƒ /dashboard, /nearby, /post-job       dynamic
├ ƒ /chat, /chat/[bookingId]             dynamic
├ ƒ /booking/[id], /job/[id]             dynamic
├ ƒ /profile, /my-jobs, /my-bids         dynamic
├ ○ /manifest.webmanifest                static
└ ƒ /api/webhooks/xendit                 dynamic
ƒ Middleware                             87.8 kB
```

## What needs to happen next (in order)

### 1. Link Supabase (REQUIRED for runtime features)
```bash
npm install -g supabase          # if not installed
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                 # applies all 8 migrations
npm run db:types                 # generates lib/supabase/database.types.ts
```
Then update `lib/supabase/types.ts` import to use the generated types, or delete it and import from `database.types.ts`. NOTE: the untyped supabase client currently infers one-to-many joins as arrays even for many-to-one relations — see `app/(app)/(worker)/find-work/page.tsx` for the workaround pattern (`profiles: { display_name: string }[]`). Generating proper Database types will fix this and let you simplify those casts.

### 2. Fill in `.env.local`
```bash
cp .env.example .env.local
```
Critical values:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase dashboard → Settings → API)
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (Google Cloud Console → OAuth, configured in Supabase Auth providers)
- `XENDIT_SECRET_KEY` + `XENDIT_WEBHOOK_SECRET` (Xendit dashboard)

### 3. Finish M2 — Trust & Reputation (IN PROGRESS)
The review form + StarRating component are done. Remaining M2 work:
- [ ] Add an aggregate rating display + review list to a public worker profile view (currently the worker profile shown to customers is just the `/nearby` card — no dedicated public profile page exists)
- [ ] Worker verification flow: upload gov't ID → `verifications` table (needs new migration) → admin review → verified badge on profiles
- [ ] Profile completeness prompts (banner nudging workers to fill bio, trades, rate)
- [ ] Portfolio/photo upload for workers (Supabase Storage bucket + UI)
- [ ] Reporting/blocking users (new `reports` table + UI)

The `createReview` Server Action (`lib/actions/reviews.ts`) and `reviews` table with RLS already exist. The `worker_profiles.rating` column is updated by a DB trigger (verify the trigger exists in `supabase/migrations/20260620000005_reviews_and_messages.sql` — if not, add one).

### 4. M3 — Discovery & Search
- [ ] Wire the `listings_search` Postgres FTS RPC (index already exists in migration `20260620000007`) into the find-work search bar (currently uses simple ILIKE)
- [ ] Add filters: price range, rating threshold (combine with existing trade/distance filters)
- [ ] Geolocation autocomplete (address → lat/lng via a geocoding provider)

### 5. M4 — Scale PH (production readiness)
- [ ] GCash/Maya live payment integration (real Xendit keys)
- [ ] Push notifications (job awarded, new bid, chat message, payment received)
- [ ] Offline mode (view cached jobs, queue mutations) — Serwist runtime caching config
- [ ] NPC Data Privacy Act compliance (privacy notice, data retention policy)
- [ ] Analytics (PostHog) + error tracking (Sentry)
- [ ] Security audit (RLS policies, auth flow, webhook signatures)
- [ ] Deploy: Frontend → Vercel, Backend → Supabase (see docs/deployment.md)

### 6. Test the core loop locally
```bash
npm run dev
```
The full flow is wired: sign up → pick role → post job (customer) / find work + bid (worker) → award → chat (realtime) → pay → mark complete → review. You need real Supabase linked (step 1) for any of this to work at runtime.

## Architecture cheat sheet

```
app/
  (marketing)/          Public pages (landing, about, pricing) — no auth
  (auth)/                Login, signup, role-select — no auth required
  (app)/                 Authenticated — protected by middleware
    (customer)/          Customer pages (post-job, my-jobs, job/[id])
    (worker)/            Worker pages (nearby, my-bids)
    (shared)/            Both roles (chat, booking, profile)
    dashboard/           Shared dashboard (role-aware content)
lib/
  supabase/              client.ts (browser), server.ts (RSC/actions), middleware.ts, types.ts
  payments/              types.ts (interface), xendit.ts, paymongo.ts, index.ts (factory)
  geo/                   Location helpers, haversine, radius options
  i18n/                  strings/en.ts, strings/fil.ts, index.ts (t() helper)
  validation/            zod schemas (profiles, listings, bids, bookings, reviews, messages)
  utils/                 cn.ts (tailwind-merge), currency.ts (formatCurrency, formatDistance)
supabase/
  migrations/            8 SQL migrations
  seed.sql               12 trade categories
  config.toml            Local dev Supabase config
skills/                  Custom agent skills
```

## Key patterns to follow (from AGENTS.md)

1. **Server Components by default** — Add `'use client'` only for interactivity, browser APIs, or hooks.
2. **Mutations via Server Actions** — Not API routes (except webhooks).
3. **RLS on every table** — The participant-OR pattern for marketplace data (see skills/uznir-rls).
4. **Payments through adapter** — `getGateway()` from `@/lib/payments`, never import xendit/paymongo directly.
5. **i18n through t()** — Never hardcode UI strings.
6. **Currency via Intl.NumberFormat** — Never hardcode ₱ or $.
7. **Import alias `@/`** — Always use the alias.

## Commands

```bash
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build (currently passes ✅)
npm run lint             # ESLint
npm run type-check       # TypeScript type-check
npm run db:push          # Push Supabase migrations
npm run db:generate "d"  # Create migration
npm run db:reset         # Reset DB + reseed
npm run db:types         # Regenerate types from linked Supabase
```

## Known limitations (expected)

- **Supabase not yet linked** — `lib/supabase/types.ts` is hand-written. Runtime queries work once Supabase is linked and types regenerated.
- **No live payment keys** — Webhook endpoint works but won't process real charges until Xendit keys are set.
- **iOS background geolocation** — PWA limitation; worker background tracking deferred to React Native app (M5).
- **Forms are static UI** — Post-job, profile edit, etc. render forms but don't yet call Server Actions. That's M1 work.

## Testing the project without Supabase

`npm run build` passes without credentials. `npm run dev` serves the landing page and auth pages. Runtime features (auth, DB queries, geo) fail gracefully — the middleware redirects to /login, the nearby page shows an error state. This is by design: the UI shell works, the data layer needs a real backend.
