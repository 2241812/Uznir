# Architecture

> The canonical technical architecture document for Uznir.

## Design principles

1. **Boring technology** — Postgres does geo and search. Supabase does auth and realtime. One Next.js app does SSR + PWA. No microservices at MVP.
2. **RLS-first security** — Every table has Row Level Security. The Supabase client runs as the authenticated user. No service-role key on the client.
3. **Adapter pattern for payments** — The payment gateway is an implementation detail behind a `PaymentGateway` interface. Swap providers via one env var.
4. **Role-aware routes, not separate apps** — One codebase, route groups `(customer)` and `(worker)`, shared components in `(shared)`.
5. **International-ready from day one** — i18n strings, multi-currency ledger, pluggable payment gateways. Not over-engineered — just no hardcoding.
6. **PWA first, native later** — The React Native app will share the same Supabase backend. Design the backend APIs to be client-agnostic.

---

## Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 15.x | App Router only, Turbopack in dev |
| UI | React | 19.x | Server Components by default |
| Language | TypeScript | 5.7+ | Strict mode |
| Styling | Tailwind CSS | v4 | CSS-first `@theme` config |
| Components | shadcn/ui | latest | Copy-in, Radix-based |
| Backend | Supabase | latest | Postgres + Auth + Storage + Realtime + Edge Functions |
| Database | PostgreSQL 15 | via Supabase | PostGIS extension, RLS |
| Geo | PostGIS | 3.x | `geography(point, 4326)`, `ST_DWithin` |
| Auth | Supabase Auth | native | Google OAuth + email OTP |
| Realtime | Supabase Realtime | native | Postgres Changes + Broadcast + Presence |
| Payments | Xendit XenPlatform | API v2 | GCash, Maya, cards, disbursements |
| PWA | Serwist | v9 | Service worker, precaching, offline shell |
| Forms | react-hook-form + zod | latest | Client + server validation |
| Data fetching | TanStack Query v5 | client-side only | For interactive features (chat, nearby workers) |
| Icons | lucide-react | latest | |
| Search | Postgres FTS | MVP | `tsvector` + GIN index, upgrade to Meilisearch later |

---

## Application architecture

### Route groups

```
app/
  layout.tsx                  Root layout (html, body, fonts, providers)
  globals.css                 Tailwind v4 theme
  page.tsx                    Redirect to /home or /login
  sw.ts                       Serwist service worker source
  manifest.ts                 PWA manifest

  (marketing)/
    layout.tsx                Public layout (nav, footer)
    page.tsx                  Landing page at /
    about/page.tsx
    pricing/page.tsx

  (auth)/
    layout.tsx                Minimal layout (centered card)
    login/page.tsx
    signup/page.tsx
    role-select/page.tsx      Choose customer or worker after first signup

  (app)/
    layout.tsx                Authenticated layout (sidebar nav, role-aware)
      middleware check: must be authenticated
    (customer)/
      layout.tsx              Redirects workers away
      dashboard/page.tsx
      post-job/page.tsx
      my-jobs/page.tsx
      job/[id]/page.tsx       View single job + bids received
    (worker)/
      layout.tsx              Redirects customers away
      dashboard/page.tsx
      nearby/page.tsx         "Who's near?" — the core geo feature
      my-bids/page.tsx
    (shared)/
      chat/[bookingId]/page.tsx  In-app messaging
      booking/[id]/page.tsx     Booking detail + payment status
      profile/page.tsx          Edit profile (role-aware form)

  api/
    webhooks/
      xendit/route.ts         Xendit webhook handler
      paymongo/route.ts       PayMongo webhook handler
```

### Data flow

```
Browser
  ↓ (fetch / Server Action)
Next.js Server Component / Server Action
  ↓ (Supabase client with user cookie)
Supabase Postgres (RLS enforces row access)
  ↓ (for webhooks)
Supabase Edge Function (service role)
  ↓ (for payments)
Xendit API / PayMongo API
```

### Auth flow

1. User visits `/login`.
2. Signs in via Google OAuth or email OTP (Supabase Auth).
3. First-time users land on `/role-select` — choose "Customer" or "Worker" (or both).
4. Role is stored in `profiles.role`. Middleware reads this to gate routes.
5. Session cookie is refreshed on every request by `middleware.ts` (Supabase SSR pattern).

---

## Data model

See [data-model.md](./data-model.md) for the full ER diagram and table documentation.

### Core entities

- **profiles** — 1:1 with `auth.users`. Holds `display_name`, `avatar_url`, `role` (customer/worker/both), `phone`, `is_verified`.
- **worker_profiles** — Extends profiles with `bio`, `hourly_rate`, `location` (PostGIS point), `is_available`, `rating`.
- **worker_trades** — Many-to-many join between workers and trade categories.
- **listings** — Jobs posted by customers. Has `status` (open/awarded/in_progress/done/cancelled) and `location`.
- **bids** — Workers apply to listings with an `amount` and `message`.
- **bookings** — Created when a customer awards a bid. Tracks `status` (scheduled/in_progress/completed/cancelled/disputed).
- **reviews** — One per side per booking. `rating` (1-5) + text.
- **messages** — Chat messages between booking participants.
- **payments_ledger** — Append-only. Every charge and payout is a row. Source of truth for reconciliation.

---

## Security — Row Level Security

Every table has RLS enabled. Key patterns:

### User's own data
```sql
create policy "users update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

### Listings: customer sees own, worker sees open
```sql
create policy "listings: customer sees own, worker sees open"
  on listings for select to authenticated
  using (
    auth.uid() = customer_id
    or status = 'open'
    or exists (
      select 1 from bids b
      where b.listing_id = listings.id and b.worker_id = auth.uid()
    )
  );
```

### Messages: booking participants (the participant-OR pattern)
```sql
create policy "messages between booking participants"
  on messages for select to authenticated
  using (
    exists (
      select 1 from bookings b
      where b.id = messages.booking_id
        and (b.customer_id = auth.uid() or b.worker_id = auth.uid())
    )
  );
```

> **Critical:** Use OR, not AND. A user is ONE side of a booking. AND would require the user to be both customer AND worker simultaneously — which never happens.

---

## Geolocation — "Who's near?"

### PostGIS on Supabase

Supabase ships with PostGIS. No separate geo service needed for MVP.

### Storage

Worker locations are stored as `geography(point, 4326)` in `worker_profiles.location`.
Note: `ST_MakePoint` takes `(longitude, latitude)` — longitude first.

### Index

```sql
create index worker_profiles_location_idx
  on worker_profiles using gist (location);
```

### RPC: `nearby_workers`

The canonical way to find workers. Accepts lat, lng, radius_km, and optional trade filter.

```sql
create or replace function nearby_workers(
  p_lat float, p_lng float, p_radius_km float, p_trade_id int default null
)
returns table (
  profile_id uuid, display_name text, avatar_url text,
  hourly_rate numeric, rating numeric, distance_km float
)
language sql stable as $$
  select wp.profile_id, p.display_name, p.avatar_url,
         wp.hourly_rate, wp.rating,
         st_distance(wp.location, st_makepoint(p_lng, p_lat)::geography) / 1000.0 as distance_km
  from worker_profiles wp
  join profiles p on p.id = wp.profile_id
  where wp.is_available
    and st_dwithin(wp.location, st_makepoint(p_lng, p_lat)::geography, p_radius_km * 1000)
    and (p_trade_id is null or exists (
      select 1 from worker_trades wt
      where wt.worker_id = wp.profile_id and wt.trade_id = p_trade_id
    ))
  order by distance_km;
$$;
```

Client call:
```ts
const { data } = await supabase.rpc('nearby_workers', {
  p_lat: 14.5995, p_lng: 120.9842, p_radius_km: 10, p_trade_id: 3
});
```

### When to add a separate geo service

Only when you need: isochrone/drive-time routing (OSRM/Valhalla), map tiles (MapLibre), or fleet-scale live tracking. None of that applies at MVP.

---

## Payments — Xendit XenPlatform

See [payments.md](./payments.md) for full details.

### Architecture

- `PaymentGateway` interface in `lib/payments/types.ts`.
- Implementations: `xendit.ts`, `paymongo.ts`.
- Factory: `getGateway()` reads `NEXT_PUBLIC_PAYMENT_GATEWAY` env var.
- Append-only `payments_ledger` table is the source of truth.
- Escrow: capture on charge, release (payout to worker) on booking `completed`, refund on `cancelled`.

### International expansion

- PH: Xendit (GCash, Maya, cards, bank transfer)
- International: Stripe (cards, Connect for marketplace payouts)
- Swap via `NEXT_PUBLIC_PAYMENT_GATEWAY=xendit` → `NEXT_PUBLIC_PAYMENT_GATEWAY=stripe`
- Currency column on `payments_ledger` supports multiple currencies.

---

## Search — Postgres FTS (MVP)

### Implementation

- `search_vector tsvector` column on `listings` (generated from `title || ' ' || description`).
- GIN index on the search vector.
- Query with `websearch_to_tsquery('english', $query)` + rank with `ts_rank`.
- Combined with trade filter and geo filter in the same RPC.

### When to upgrade

- When users expect instant (<50ms) typo-tolerant results.
- When you need faceted filters with live counts.
- When write volume makes trigger-maintained tsvector expensive.
- Migration path: sync to Meilisearch/Typesense via Supabase Realtime WAL webhook.

---

## PWA — Serwist

### Setup

- `app/sw.ts` — Service worker source with Serwist precaching + runtime caching.
- `app/manifest.ts` — Web App Manifest (name, icons, theme colors, `display: standalone`).
- `next.config.ts` — Wrapped with `withSerwist()` plugin.
- Disabled in development mode.

### Offline

- Serwist `defaultCache` covers fonts, static assets, images.
- Navigation fallback to offline shell page.
- Mutations queued via Background Sync (where supported).

### iOS limitations (honest)

- **Web Push:** Works only on iOS 16.4+, only when PWA is added to Home Screen, requires user gesture for subscription.
- **Background geolocation:** Not viable in iOS PWAs. JS stops when app is backgrounded. This feature requires the React Native app with native background-location entitlements.

---

## Realtime — Chat

### Channels

1. **Postgres Changes** — Subscribe to INSERT on `messages` filtered by `booking_id`. Respects RLS automatically.
2. **Broadcast** — Typing indicators (ephemeral, not persisted).
3. **Presence** — Online/offline status dots in chat header.

### Performance note

Postgres Changes uses polling (configurable frequency). At very high write volume, consider `realtime.broadcast_changes()` for lower-latency push. Not needed at MVP scale.

---

## Deployment

See [deployment.md](./deployment.md).

### Summary

| Component | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploys from `main`, preview deploys from PRs |
| Database | Supabase Cloud | Free tier for dev, Pro for production |
| Auth | Supabase Auth | Same as database |
| Storage | Supabase Storage | Worker avatars, job photos |
| Payments | Xendit Dashboard | Merchant account + webhook endpoint |
| Domain | Vercel or custom registrar | SSL via Vercel |

### Environment flow

1. `.env.example` is the template — committed to repo.
2. `.env.local` holds secrets — never committed.
3. Vercel: set env vars in Vercel dashboard.
4. Supabase: set secrets in Supabase Edge Function secrets.
