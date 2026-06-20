# Roadmap

> Phased build milestones for Uznir.

## M0 — Foundation (Current)

**Goal:** Project scaffold, database schema, auth, "Who's near?" page, PWA shell.

### Deliverables
- [x] Project structure, configs, documentation suite
- [x] AGENTS.md for AI agents
- [x] Custom skills (feature, RLS, migration, i18n)
- [ ] Supabase migrations (all tables, RLS, PostGIS, FTS)
- [ ] Supabase lib layer (client, server, middleware)
- [ ] Auth pages (login, signup, role selection)
- [ ] App shell (layouts, route groups)
- [ ] "Who's near?" page with PostGIS RPC
- [ ] PWA manifest + service worker (Serwist)
- [ ] Payments adapter interface (skeleton — no live keys)
- [ ] i18n dictionary structure (en, fil)
- [ ] `npm run build` passes

### Acceptance criteria
- `npm run dev` serves a working landing page.
- Database migrations apply cleanly with `supabase db push`.
- Auth flow works (Google OAuth + email OTP).
- "Who's near?" page renders (dummy data until Supabase is linked).
- PWA is installable (manifest + service worker).

---

## M1 — Core Loop

**Goal:** The fundamental transaction — customer posts a job, worker bids, customer awards, they chat, money moves.

### Deliverables
- [ ] Post a job form (title, description, trade, budget, location)
- [ ] Job listing page (browse open jobs)
- [ ] Bid form (amount, message)
- [ ] Bid list on job detail (customer view)
- [ ] Award bid → create booking
- [ ] Chat page (real-time messages via Supabase Realtime)
- [ ] Payment charge flow (customer pays via Xendit/PayMongo)
- [ ] Payout flow (worker receives payment on booking completion)
- [ ] Booking status lifecycle (scheduled → in_progress → completed → cancelled)
- [ ] Dashboard pages (customer: my jobs; worker: my bids, earnings)

### Acceptance criteria
- Full loop: post job → receive bids → award → chat → pay → complete → review.
- Real-time chat works between two browser tabs.
- Payment webhooks are received and processed correctly.
- All RLS policies are tested and correct.

---

## M2 — Trust & Reputation

**Goal:** Reviews, ratings, worker verification, profile completeness.

### Deliverables
- [ ] Review form (after booking completion)
- [ ] Star ratings on worker profiles (aggregated)
- [ ] Worker verification flow (upload ID, admin review)
- [ ] Verified badge on profiles
- [ ] Profile completeness prompts
- [ ] Portfolio/photo upload for workers (Supabase Storage)
- [ ] Reporting/blocking users

### Acceptance criteria
- Users can rate each other 1–5 after completing a booking.
- Worker profiles show aggregate rating.
- Workers can upload an ID for verification.
- Admin can approve/reject verifications.

---

## M3 — Discovery & Search

**Goal:** Users can find the right worker or job quickly.

### Deliverables
- [ ] Search bar with Postgres FTS (title, description, trade name)
- [ ] Filters: trade category, distance radius, price range, rating
- [ ] Sorted results (relevance, distance, rating, price)
- [ ] Job recommendations (similar trades, nearby)
- [ ] Worker suggestions for customers
- [ ] "Urgent" / "now" flag for immediate jobs
- [ ] Geolocation autocomplete (address → lat/lng)

### Acceptance criteria
- Search returns relevant results within 200ms.
- Filters combine correctly (trade + distance + price + rating).
- Results are ranked sensibly.

---

## M4 — Scale PH

**Goal:** Production-ready for Philippines launch.

### Deliverables
- [ ] GCash live payment integration
- [ ] Maya live payment integration
- [ ] Push notifications (job awarded, new bid, chat message, payment received)
- [ ] Offline mode (view cached jobs, queue mutations)
- [ ] Performance optimization (image optimization, lazy loading, caching)
- [ ] NPC Data Privacy Act compliance (privacy notice, data retention)
- [ ] Analytics (Mixpanel or PostHog)
- [ ] Error tracking (Sentry)
- [ ] Mobile-responsive polish (low-data, low-end device testing)
- [ ] Security audit (RLS policies, auth flow, webhook signatures)

### Acceptance criteria
- Real money flows through GCash and Maya.
- Push notifications work on Android and iOS (PWA Home Screen).
- App works acceptably on 3G with a low-end Android device.
- Privacy notice is live. Data retention policy is documented.

---

## M5 — International Expansion

**Goal:** Multi-region, multi-currency, multi-language.

### Deliverables
- [ ] Stripe integration (for non-PH markets)
- [ ] Multi-currency support (USD, IDR, MYR, etc.)
- [ ] Region-specific payment methods
- [ ] Additional languages (Bahasa Indonesia, Malay, etc.)
- [ ] Region-specific legal pages (terms, privacy, etc.)
- [ ] CDN / edge caching for multi-region
- [ ] React Native app (iOS + Android) sharing the same Supabase backend
- [ ] Background location for workers (native)
- [ ] App store submission (Apple, Google Play)

### Acceptance criteria
- User can switch region and see local currency, language, and payment methods.
- Stripe processes payments in non-PH markets.
- React Native app is functionally equivalent to the web app.
- App is live on Apple App Store and Google Play.

---

## Timeline estimate

| Phase | Duration | Dependencies |
|---|---|---|
| M0 | 2–3 weeks | None |
| M1 | 4–6 weeks | M0 |
| M2 | 2–3 weeks | M1 |
| M3 | 2–3 weeks | M1 |
| M4 | 3–4 weeks | M1, M2 |
| M5 | 8–12 weeks | M4 |

M1 and M2 are the critical path. M3 and M4 can partially overlap with M2. M5 is a separate initiative that begins after PH launch is stable.

## Cost estimates (PH launch)

| Item | Monthly cost | Notes |
|---|---|---|
| Vercel (Pro) | $20 | Hosting, CI/CD |
| Supabase (Pro) | $25 | 8GB DB, 50GB storage, 500K Realtime messages |
| Xendit | Per-transaction | ~2.9% + PHP 15 per charge |
| Domain | $10/year | |
| Twilio (SMS OTP) | ~$0.05/SMS | If used |
| **Total (pre-transaction)** | **~$55/month** | |

> Xendit fees scale with GMV. At 1,000 bookings/month averaging PHP 2,000: ~PHP 78,000 in fees (~$1,300).
