# Deployment

> How to deploy Uznir to production.

## Architecture

| Component | Platform | Purpose |
|---|---|---|
| Frontend | Vercel | Next.js hosting, auto-deploy, CDN |
| Database | Supabase Cloud | Postgres, Auth, Storage, Realtime, Edge Functions |
| Payments | Xendit | Payment processing, disbursements |
| Domain | Your registrar | Custom domain with SSL |

## Prerequisites

1. **Supabase project** — Create at [app.supabase.com](https://app.supabase.com)
2. **Vercel account** — Create at [vercel.com](https://vercel.com)
3. **Xendit account** — Create at [dashboard.xendit.co](https://dashboard.xendit.co) (PH business registration required)
4. **Domain** — Optional but recommended for production

## Step 1: Set up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project (replace <project-ref> with your Supabase project ID)
supabase link --project-ref <project-ref>

# Push all migrations
supabase db push
```

### Configure auth providers

In Supabase Dashboard → Authentication → Providers:
- **Google:** Enable, add Client ID and Client Secret from Google Cloud Console.
- **Email:** Enable, configure OTP settings.

### Configure storage

In Supabase Dashboard → Storage:
- Create bucket `avatars` (public, max 2MB, image types only).
- Create bucket `job-photos` (public, max 5MB, image types only).

## Step 2: Set up Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Environment variables (Vercel Dashboard → Settings → Environment Variables)

Copy all values from `.env.example` and fill in real values:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role secret |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth 2.0 Client Secret |
| `NEXT_PUBLIC_PAYMENT_GATEWAY` | Set to `xendit` |
| `XENDIT_SECRET_KEY` | Xendit Dashboard → API Keys |
| `XENDIT_WEBHOOK_SECRET` | Xendit Dashboard → Webhooks (created in Step 3) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain (e.g. `https://uznir.vercel.app`) |

## Step 3: Set up Xendit webhooks

1. In Vercel, note your deployment URL (e.g. `https://uznir.vercel.app`).
2. In Xendit Dashboard → Webhooks → Create:
   - **Callback URL:** `https://uznir.vercel.app/api/webhooks/xendit`
   - **Events:** `invoice.paid`, `invoice.payment_failed`, `disbursement.created`, `disbursement.completed`, `disbursement.failed`
3. Copy the webhook verification secret to `XENDIT_WEBHOOK_SECRET` in Vercel env vars.

## Step 4: Custom domain (optional)

1. In Vercel Dashboard → Domains → Add your domain.
2. Update DNS records at your registrar as Vercel instructs.
3. SSL is automatic.

## Step 5: Generate VAPID keys for push notifications

```bash
npx web-push generate-vapid-keys
```

Add the public key to Vercel env vars (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) and the private key + subject to server secrets.

## Step 6: Verify

```bash
# Build should pass
npm run build

# Push to GitHub — Vercel auto-deploys from main
git push origin main
```

Check:
- [ ] Site loads at your domain
- [ ] Auth works (Google OAuth + email OTP)
- [ ] Database migrations applied (check Supabase Dashboard → Table Editor)
- [ ] Webhook endpoint responds (POST to `/api/webhooks/xendit` returns 200)
- [ ] PWA is installable (check manifest loads)

## Local development

```bash
# Copy env vars locally
cp .env.example .env.local
# Fill in your Supabase credentials

# Run Supabase locally (optional, requires Docker)
supabase start
supabase db reset --seed

# Run the dev server
npm run dev
```

## Monitoring

- **Errors:** Add Sentry (`@sentry/nextjs`) in M4.
- **Analytics:** Add PostHog or Mixpanel in M4.
- **Uptime:** Vercel provides built-in uptime monitoring.
- **Webhooks:** Log all webhook events to `payments_ledger` for reconciliation.
