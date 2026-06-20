# Uznir — "Who's near?"

A PH-first, international-ready two-sided marketplace connecting customers who need odd jobs done (drivers, carpenters, plumbers, electricians, couriers/errands, cleaners, handymen) with local freelancers who get paid for their services.

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/your-username/uznir.git
cd uznir
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in your Supabase URL + anon key (get from https://app.supabase.com)

# 3. Push database schema
supabase db push

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What it does

| For Customers | For Workers |
|---|---|
| Post a job (describe, budget, location) | Create a worker profile (trades, rate, service area) |
| Browse nearby workers by trade & distance | Browse open jobs near you |
| Receive bids from workers | Bid on jobs that match your skills |
| Chat with workers in-app | Chat with customers in-app |
| Pay securely via GCash / Maya / card | Get paid directly to your GCash / Maya / bank |
| Rate & review workers | Build reputation through ratings |

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + React 19 + TypeScript | SSR, Server Actions, route groups for roles |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Fast iteration, accessible Radix primitives |
| **Backend** | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) | Row-level security, PostGIS, real-time chat, zero infra |
| **Geo** | PostGIS on Supabase | `ST_DWithin` RPC for "who's near?" — no separate service |
| **Payments** | Xendit XenPlatform (PH) — adapter pattern | Marketplace split-payments + disbursements; swap to Stripe internationally |
| **PWA** | Serwist | Installable, offline shell, push notifications |
| **Forms** | react-hook-form + zod | Client + server validation, shared schemas |
| **Search** | Postgres FTS (MVP) | Upgrade to Meilisearch when needed |

## Architecture

```
app/
  (marketing)/          Landing page, about, pricing
  (auth)/                Login, signup, role selection
  (app)/
    (customer)/          Dashboard, post-job, my-jobs
    (worker)/            Dashboard, nearby (Who's near?), my-bids
    (shared)/            Chat, booking, profile (role-aware inside)
  api/                   Webhook handlers (Xendit, PayMongo)
lib/
  supabase/              Client, server, middleware, types
  payments/              Gateway interface, Xendit, PayMongo, ledger
  geo/                   Location helpers, radius formatting
  i18n/                  Filipino + English dictionaries
  validation/            Shared zod schemas
  utils/                 cn(), formatters, etc.
supabase/migrations/     All database migrations
docs/                     Architecture, data model, roadmap, payments, deployment
skills/                   Custom AI-agent skills for this project
```

Read [AGENTS.md](./AGENTS.md) for the AI-agent operating manual, or [docs/architecture.md](./docs/architecture.md) for the full technical architecture.

## Roadmap at a glance

| Phase | Status | Description |
|---|---|---|
| **M0 — Foundation** | In progress | Project scaffold, DB schema, auth, "Who's near?" page |
| **M1 — Core loop** | Planned | Post job, bid on job, award, chat, payment |
| **M2 — Trust & reputation** | Planned | Reviews, ratings, worker verification |
| **M3 — Discovery** | Planned | Search, filters, recommendations, categories |
| **M4 — Scale PH** | Planned | GCash/Maya live, push notifications, offline mode |
| **M5 — International** | Planned | Multi-currency, Stripe, new regions |

See [docs/roadmap.md](./docs/roadmap.md) for detailed milestones.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](./LICENSE).
