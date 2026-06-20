# AGENTS.md — AI Agent Operating Manual

> This file tells AI coding agents (ZCode, Claude Code, Cursor, Copilot) how to work with the Uznir codebase. Read this file first before making any changes.

## Project overview

**Uznir** ("Who's near?") is a two-sided marketplace web app (PWA) connecting customers with local freelancers in the Philippines. It launches PH-first (GCash/Maya payments, Filipino+English UI) but is designed for international expansion.

- **Monorepo?** No — single Next.js app with Supabase backend.
- **Package manager:** npm.
- **Runtime:** Node.js 20+.
- **Platform:** Web (PWA) now, React Native later (same Supabase backend).

## Tech stack (versions matter)

| Package | Version | Notes |
|---|---|---|
| Next.js | 15.x | App Router only. No Pages Router. |
| React | 19.x | React 19 features (use(), Server Components) |
| TypeScript | strict | `"strict": true` in tsconfig — never relax this. |
| Tailwind CSS | v4 | CSS-first config via `@theme` in `app/globals.css`. No `tailwind.config.js`. |
| shadcn/ui | latest | Copy-in components in `components/ui/`. Not an npm dependency. |
| Supabase | `@supabase/ssr` + `@supabase/supabase-js` | Cookie-based auth via middleware. |
| TanStack Query | v5 | Client-side data fetching for interactive features. |
| react-hook-form + zod | latest | Shared schemas in `lib/validation/`. |
| Serwist | v9 | PWA service worker. Disabled in dev mode. |

## Architecture rules

### 1. Route groups reflect roles, not auth gates

```
app/
  (marketing)/          # Public — no auth required
  (auth)/                # Login/signup — no auth required
  (app)/
    (customer)/          # Customer-specific pages
    (worker)/            # Worker-specific pages
    (shared)/            # Pages both roles use (chat, booking)
```

Auth enforcement is in `middleware.ts` (redirect unauthenticated users to `/login`). Role-specific middleware checks happen at the layout level in `(customer)/layout.tsx` and `(worker)/layout.tsx`.

### 2. Data access — RLS is the security model

- **Every table has Row Level Security enabled.** This is not optional.
- Users can only see data they are party to (the "participant-OR" pattern).
- The Supabase client runs as the authenticated user; there is no service-role key on the client.
- If you need to bypass RLS, use a Supabase Edge Function (server-side only) with the service role key.

RLS policy pattern (the classic marketplace bug to avoid):
```sql
-- CORRECT: use OR — a user is ONE side of a booking, never both
create policy "messages read" on messages
  for select to authenticated
  using (
    exists (
      select 1 from bookings b
      where b.id = messages.booking_id
        and (b.customer_id = auth.uid() or b.worker_id = auth.uid())
    )
  );
```

### 3. Database changes go through migrations

- All schema changes are in `supabase/migrations/` with timestamp prefixes.
- Run `npm run db:generate "description"` to create a new migration.
- Run `npm run db:push` to apply.
- Run `npm run db:types` to regenerate TypeScript types after schema changes.
- **Never edit Supabase tables directly.** Always write a migration.
- Seed data goes in `supabase/seed.sql`.

### 4. Server Components by default, 'use client' only when needed

Default: every component is a Server Component.
Add `'use client'` only when the component needs:
- Interactivity (onClick, useState, useEffect)
- Browser APIs (geolocation, service worker)
- TanStack Query hooks
- react-hook-form

### 5. Mutations go through Server Actions

- Create/update/delete operations use Server Actions (defined in `app/` or `lib/actions/`).
- Server Actions validate input with zod schemas from `lib/validation/`.
- After a mutation, call `revalidatePath` or `revalidateTag` to refresh cache.
- Do NOT create REST API routes unless you need a webhook endpoint (those go in `app/api/`).

### 6. Payments — always go through the adapter

```ts
import { getGateway } from "@/lib/payments";
const gateway = getGateway(); // reads NEXT_PUBLIC_PAYMENT_GATEWAY env
const charge = await gateway.createCharge({ amount, currency, customerId, bookingId });
```

Never import xendit.ts or paymongo.ts directly — always use `getGateway()`. This keeps the provider swappable via a single env var.

### 7. Internationalization

- UI strings live in `lib/i18n/strings/{en.ts, fil.ts}`.
- Use the `t()` helper from `lib/i18n/index.ts`.
- Currency values are stored as `numeric(10,2)` in PHP (or the active currency).
- Format currency at the display layer only with `Intl.NumberFormat` — never hardcode ₱ or $ in business logic.
- Taglish is acceptable in Filipino strings when it matches how Filipinos naturally communicate.

### 8. Geo queries

- All location data is stored as `geography(point, 4326)` — longitude first, latitude second in `ST_MakePoint(lng, lat)`.
- The `nearby_workers` PostGIS RPC is the canonical way to find workers near a point.
- Client passes `p_lat, p_lng, p_radius_km, p_trade_id` to the RPC.
- Do NOT write raw PostGIS queries from the client — use the RPC or create a new one.

### 9. File naming

- Components: `PascalCase.tsx` (e.g. `JobCard.tsx`, `WorkerProfileCard.tsx`)
- Server Actions: `camelCase.ts` (e.g. `createListing.ts`, `placeBid.ts`)
- Utilities: `camelCase.ts` (e.g. `cn.ts`, `formatCurrency.ts`)
- Migrations: `YYYYMMDDHHMMSS_description.sql`

### 10. Import alias

All imports use `@/` (mapped to project root in tsconfig):
```ts
import { cn } from "@/lib/utils/cn";
import { nearbyWorkersSchema } from "@/lib/validation/listings";
import { getGateway } from "@/lib/payments";
```

## Common commands

```bash
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript type-check (no emit)
npm run db:push          # Push pending Supabase migrations
npm run db:generate "description"  # Create new migration
npm run db:reset         # Reset DB + reapply all migrations + seed
npm run db:types         # Regenerate Supabase TypeScript types
```

## File conventions

| Path | Purpose |
|---|---|
| `app/globals.css` | Tailwind v4 theme config (`@theme`), global styles |
| `lib/supabase/client.ts` | Browser-side Supabase client |
| `lib/supabase/server.ts` | Server-side Supabase client (Server Components + Actions) |
| `lib/supabase/middleware.ts` | Supabase auth middleware (refreshes session cookie) |
| `lib/supabase/database.types.ts` | Auto-generated types (do not edit manually) |
| `lib/payments/types.ts` | PaymentGateway interface |
| `lib/payments/index.ts` | `getGateway()` factory |
| `lib/validation/*.ts` | Shared zod schemas |
| `lib/i18n/strings/*.ts` | UI translations |
| `components/ui/*.tsx` | shadcn/ui primitives (Button, Input, Card, etc.) |
| `components/features/**` | Domain-specific components |

## Testing (future)

Tests will use Vitest + React Testing Library. Test files go in `__tests__/` adjacent to source, or in a top-level `tests/` directory for integration tests. Not yet implemented in M0.

## What NOT to do

- Do NOT bypass RLS by putting the service role key in client code.
- Do NOT write raw SQL in components — use Server Actions or Supabase client methods.
- Do NOT hardcode currency symbols or locale-specific formatting.
- Do NOT create API routes for mutations — use Server Actions.
- Do NOT add `useEffect` to Server Components.
- Do NOT import from `@supabase/supabase-js` directly — use `@/lib/supabase/client` or `@/lib/supabase/server`.
- Do NOT edit auto-generated files (`database.types.ts`, `next-env.d.ts`).
