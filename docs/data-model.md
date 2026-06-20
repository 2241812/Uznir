# Data Model

> Entity-relationship overview for the Uznir marketplace.

## ER Diagram (text)

```
auth.users (Supabase managed)
  │
  └──1:1──→ profiles
              │
              ├──1:1──→ worker_profiles
              │              │
              │              ├──M:N──→ trades (via worker_trades)
              │              └──  location: geography(point, 4326)
              │
              ├──1:N──→ listings (customer_id)
              │              │
              │              └──1:N──→ bids (worker_id)
              │
              ├──1:N──→ bookings (customer_id)
              │              │
              │              ├──1:N──→ reviews (author_id)
              │              ├──1:N──→ messages (sender_id)
              │              └──1:N──→ payments_ledger
              │
              └──1:N──→ bookings (worker_id)
                         └──1:N──→ reviews (subject_id)
```

## Tables

### `profiles`

1:1 with `auth.users`. Created automatically via a trigger on `auth.users` insert.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users` | `on delete cascade` |
| `display_name` | `text` | NOT NULL | |
| `avatar_url` | `text` | nullable | Supabase Storage URL |
| `role` | `text` | NOT NULL | CHECK: `customer`, `worker`, `both` |
| `phone` | `text` | nullable | E.164 format |
| `is_verified` | `boolean` | `false` | Manual or ID verification |
| `created_at` | `timestamptz` | `now()` | |

**RLS:**
- All authenticated users can SELECT profiles (needed to show worker cards, customer names).
- Users can UPDATE only their own profile.
- INSERT is only via trigger from `auth.users`.

---

### `trades`

Reference table for job categories / worker skills.

| Column | Type | Notes |
|---|---|---|
| `id` | `int` | PK |
| `slug` | `text` | UNIQUE, e.g. `plumber`, `driver` |
| `name` | `text` | Display name, e.g. `Plumber` |

**Seed data:** driver, carpenter, plumber, electrician, courier, cleaner, handyman, painter, gardener, welder, mover, AC technician.

---

### `worker_profiles`

Extended profile for users with the `worker` role.

| Column | Type | Default | Notes |
|---|---|---|---|
| `profile_id` | `uuid` | PK, FK → `profiles(id)` | `on delete cascade` |
| `bio` | `text` | nullable | |
| `hourly_rate` | `numeric(10,2)` | nullable | In PHP or active currency |
| `location` | `geography(point, 4326)` | nullable | PostGIS — lng, lat in ST_MakePoint |
| `is_available` | `boolean` | `true` | Workers toggle this |
| `rating` | `numeric(2,1)` | `0.0` | Aggregate, updated by trigger |

**Index:** GIST on `location` for PostGIS queries.

**RLS:** Workers can UPDATE their own. All authenticated can SELECT (for nearby-workers results).

---

### `worker_trades`

Many-to-many: which trades a worker offers.

| Column | Type | Notes |
|---|---|---|
| `worker_id` | `uuid` | PK, FK → `worker_profiles(profile_id)` |
| `trade_id` | `int` | PK, FK → `trades(id)` |

---

### `listings`

Jobs posted by customers.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `customer_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `title` | `text` | NOT NULL | |
| `description` | `text` | nullable | |
| `trade_id` | `int` | FK → `trades(id)` | What kind of job |
| `budget` | `numeric(10,2)` | nullable | Customer's max budget |
| `status` | `text` | `'open'` | CHECK: `open`, `awarded`, `in_progress`, `done`, `cancelled` |
| `location` | `geography(point, 4326)` | nullable | Where the job is |
| `search_vector` | `tsvector` | auto-generated | For FTS |
| `created_at` | `timestamptz` | `now()` | |

**RLS:**
- Customers see their own listings.
- Workers see all `open` listings (and any they've bid on).
- UPDATE/DELETE restricted to the customer who created the listing.

---

### `bids`

Workers apply to listings.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `listing_id` | `uuid` | NOT NULL, FK → `listings(id)` CASCADE | |
| `worker_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `amount` | `numeric(10,2)` | NOT NULL | Worker's proposed price |
| `message` | `text` | nullable | |
| `status` | `text` | `'pending'` | CHECK: `pending`, `accepted`, `rejected` |
| `created_at` | `timestamptz` | `now()` | |

**Unique:** (listing_id, worker_id) — one bid per worker per listing.

**RLS:**
- Workers see their own bids.
- Customers see all bids on their listings.

---

### `bookings`

Created when a customer accepts a bid.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `listing_id` | `uuid` | FK → `listings(id)` | nullable if created directly |
| `customer_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `worker_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `status` | `text` | CHECK: `scheduled`, `in_progress`, `completed`, `cancelled`, `disputed` | |
| `scheduled_at` | `timestamptz` | nullable | When the job should happen |
| `final_price` | `numeric(10,2)` | nullable | Agreed price (may differ from bid) |
| `created_at` | `timestamptz` | `now()` | |

**RLS:**
- Both customer and worker can see bookings they're part of.
- Only the booking's participants can update.

---

### `reviews`

One per side per booking (customer reviews worker, worker reviews customer).

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `booking_id` | `uuid` | NOT NULL, FK → `bookings(id)` | |
| `author_id` | `uuid` | NOT NULL, FK → `profiles(id)` | Who wrote it |
| `subject_id` | `uuid` | NOT NULL, FK → `profiles(id)` | Who is reviewed |
| `rating` | `int` | NOT NULL | CHECK: 1–5 |
| `body` | `text` | nullable | |
| `created_at` | `timestamptz` | `now()` | |

**Unique:** (booking_id, author_id) — one review per person per booking.

**RLS:** Visible to the booking's participants. INSERT restricted to participants of a `completed` booking.

---

### `messages`

Chat messages between booking participants.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `booking_id` | `uuid` | NOT NULL, FK → `bookings(id)` CASCADE | |
| `sender_id` | `uuid` | NOT NULL, FK → `profiles(id)` | |
| `body` | `text` | NOT NULL | |
| `created_at` | `timestamptz` | `now()` | |

**RLS (participant-OR pattern):**
- Both customer and worker of the booking can read/insert messages.
- No AND — a user is ONE side.

---

### `payments_ledger`

Append-only financial record. Source of truth for reconciliation.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `booking_id` | `uuid` | FK → `bookings(id)` | |
| `actor_id` | `uuid` | FK → `profiles(id)` | Customer or worker |
| `direction` | `text` | NOT NULL | CHECK: `in`, `out` |
| `amount` | `numeric(10,2)` | NOT NULL | |
| `currency` | `text` | `'PHP'` | ISO 4217 |
| `provider` | `text` | | `xendit`, `paymongo`, `stripe` |
| `provider_charge_id` | `text` | | For reconciliation with gateway |
| `status` | `text` | CHECK: `pending`, `captured`, `paid_out`, `refunded`, `failed` | |
| `created_at` | `timestamptz` | `now()` | |

**Net position per booking:** `sum(where direction='in') - sum(where direction='out')`.

**RLS:** Users can see payments for bookings they're part of.
