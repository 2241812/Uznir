# Agent Handoff — Uznir Project

> Read this first if you're an AI coding agent (opencode, Claude Code, Cursor, ZCode, etc.) picking up this project. Then read AGENTS.md for the coding manual.

## Project overview

**Uznir** ("Who's near?") — A PH-first, international-ready two-sided marketplace PWA connecting customers with local freelancers (drivers, carpenters, plumbers, electricians, couriers, cleaners, handymen).

- **GitHub:** https://github.com/2241812/Uznir
- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind v4 + Supabase + Serwist (PWA)
- **Platform:** Web (PWA) now, React Native later
- **Node:** 20+ (see `.nvmrc`)

## Current state — M0 Foundation is COMPLETE ✅

The project is scaffolded, all 19 routes build successfully, and the PWA is installable. The build passes cleanly: `npm run build` → ✓ Compiled successfully.

### What's done

| Area | Status | Details |
|---|---|---|
| Project scaffold | ✅ Done | package.json, tsconfig, postcss, next.config with Serwist |
| Git repo | ✅ Done | Initialized locally, committed |
| Documentation | ✅ Done | README, AGENTS.md, architecture.md, data-model.md, payments.md, roadmap.md, deployment.md, CONTRIBUTING.md, **this handoff doc** |
| Custom skills | ✅ Done | skills/uznir-feature, uznir-rls, uznir-db-migration, uznir-i18n |
| Supabase lib | ✅ Done | client.ts, server.ts, middleware.ts, types.ts (hand-written — replace with `db:types` output after linking) |
| Payments lib | ✅ Done | Gateway interface, Xendit + PayMongo adapters, factory, commission helpers |
| i18n | ✅ Done | en.ts, fil.ts dictionaries, t() helper with fallback, resolveLocale() |
| Validation | ✅ Done | zod schemas for profiles, listings, bids, bookings, reviews, messages |
| Geo utils | ✅ Done | getUserLocation(), haversineDistance(), RADIUS_OPTIONS |
| DB migrations | ✅ Done | 8 migrations: profiles+auth, trades+workers, listings, bids, bookings, reviews+messages, payments_ledger, PostGIS RPC+FTS |
| Seed data | ✅ Done | 12 trade categories |
| App shell | ✅ Done | Root, marketing, auth, (app) layouts with sidebar + mobile bottom nav |
| Pages (19) | ✅ Done | All route groups populated |
| shadcn components | ✅ Done | Button, Input, Card, Label, Badge, Select, Skeleton |
| PWA | ✅ Done | manifest.ts, sw.ts (Serwist v9), offline.html, **all icons generated** |
| Webhook handler | ✅ Done | Xendit webhook at /api/webhooks/xendit |
| GitHub templates | ✅ Done | Bug report, feature request, PR template |
| Config files | ✅ Done | .env.example, .gitignore, .gitattributes, .nvmrc, supabase/config.toml |
| **Build** | ✅ **PASSES** | `npm run build` → ✓ Compiled successfully (19 routes) |

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
Then update `lib/supabase/types.ts` import to use the generated types, or delete it and import from `database.types.ts`.

### 2. Fill in `.env.local`
```bash
cp .env.example .env.local
```
Critical values:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase dashboard → Settings → API)
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (Google Cloud Console → OAuth, configured in Supabase Auth providers)
- `XENDIT_SECRET_KEY` + `XENDIT_WEBHOOK_SECRET` (Xendit dashboard)

### 3. Test locally
```bash
npm run dev
```
- Visit `/home` → landing page
- Click login → Google OAuth or email OTP
- After auth, `/dashboard` renders with role-aware nav
- `/nearby` → "Who's near?" page (needs PostGIS data — see step 4)

### 4. Seed test data for the "Who's near?" feature
The `nearby` page calls the `nearby_workers` RPC. To see results, you need at least one worker with a location. Run in Supabase SQL Editor:
```sql
-- Insert a test worker near Manila (14.5995, 120.9842)
insert into worker_profiles (profile_id, bio, hourly_rate, location, is_available)
values (
  '<some-user-uuid>',
  'Test plumber',
  350.00,
  st_setsrid(st_makepoint(120.9900, 14.6000), 4326)::geography,
  true
);
insert into worker_trades (worker_id, trade_id) values ('<some-user-uuid>', 3); -- plumber
```

### 5. Push to GitHub
```bash
git remote add origin https://github.com/2241812/Uznir.git
git branch -M main
git push -u origin main
```

### 6. Deploy (M4) — see docs/deployment.md
- Frontend → Vercel
- Backend → Supabase (already linked)
- Payments → Xendit webhooks

### 7. M1 — Core loop (the next big milestone)
This is the major feature work:
- Wire up post-job form → Server Action → `listings` insert
- Bid form → Server Action → `bids` insert
- Award bid action → create `booking`, update `listings.status='awarded'`
- Chat page → Supabase Realtime on `messages`
- Payment charge flow via `getGateway().createCharge()`
- Payout flow on booking completion
- Booking status lifecycle (scheduled → in_progress → completed)

See `docs/roadmap.md` for full M1 acceptance criteria.

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
