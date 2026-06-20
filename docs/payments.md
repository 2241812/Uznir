# Payments

> How money moves through Uznir.

## Gateway choice: Xendit XenPlatform

### Why Xendit

- **XenPlatform** is purpose-built for marketplaces: split payments between sub-accounts, collect from customer, pay out to worker.
- Supports GCash, Maya, credit/debit cards, bank transfer (InstaPay/PESONet), over-the-counter (7-Eleven, MLhuillier, etc.).
- Robust disbursement/payout API — send money to workers' GCash/Maya/bank accounts.
- SEA-regional: PH, Indonesia, Singapore, Malaysia — supports international expansion.
- ~2.9% + PHP 15 per transaction (varies by method).

### Alternative: PayMongo

- PH-only, simpler onboarding for local SMEs.
- ~3.5% + PHP 15 per card/e-wallet charge.
- Payouts available but no dedicated marketplace split-payment product.
- Good fallback if Xendit onboarding is slow.

### Alternative: Stripe (international)

- Stripe Connect for marketplace payouts (hold + transfer).
- No GCash/Maya — card and bank only.
- Use when expanding to markets without Xendit coverage.

### Adapter pattern

All payment code goes through `lib/payments/types.ts`:

```ts
interface PaymentGateway {
  readonly name: 'xendit' | 'paymongo' | 'stripe';
  createCharge(opts: ChargeOptions): Promise<ChargeResult>;
  createPayout(opts: PayoutOptions): Promise<PayoutResult>;
  webhookVerifier(rawBody: string, headers: Record<string, string>): WebhookEvent | null;
}
```

Factory: `getGateway()` reads `NEXT_PUBLIC_PAYMENT_GATEWAY` env var and returns the correct implementation.

## Escrow flow

```
1. Customer posts job, worker bids, customer awards bid → booking created
2. Customer pays → charge created (direction='in', status='pending')
3. Webhook confirms capture → status='captured', funds held
4. Job completed → booking.status='completed'
5. Payout triggered → payout created (direction='out', status='pending')
6. Webhook confirms payout → status='paid_out', worker received money
7. Platform commission retained (difference or separate fee row)
```

### Cancellation

- If cancelled before capture: refund initiated.
- If cancelled after capture: refund to customer, no payout to worker.

### Commission model

- **Default:** Commission on completion — platform takes X% of the transaction when the booking is marked completed.
- Commission is deducted from the payout amount.
- Stored as a separate `payments_ledger` row with `direction='out'` and `actor_id=null` (platform's share).
- Rate is configurable (env var or settings table).

## Regulatory notes (Philippines)

### BSP (Bangko Sentral ng Pilipinas)

- Uznir is a **software platform**, not an e-money issuer. We facilitate payments between parties via regulated gateways (Xendit, PayMongo). We do NOT hold customer funds ourselves — the gateway holds them in escrow.
- This is the same model as Grab, GCash (marketplace partner), and other platforms that use regulated payment intermediaries.
- No BSP license required if we remain a software platform that routes payments through licensed gateways.

### Data Privacy Act of 2012

- NPC (National Privacy Commission) registration required if processing personal data of 250+ individuals or if the core business involves personal data (we process names, IDs, location, payment info — yes, we need to register).
- Privacy Notice required before data collection.
- Data subject access requests must be handled within 30 days.
- Data retention and disposal policies required.

### Worker verification

- Not legally required at MVP, but expected by customers.
- PhilSys (PhilID), driver's license, or professional license (PRC) can be used.
- Verification is manual at MVP (upload ID photo → admin review).
- Automated verification (e.g. through a third-party KYC provider) planned for M3.

## Currency

- All monetary values stored as `numeric(10,2)` — no floating-point issues.
- Currency column on `payments_ledger` defaults to `PHP`.
- Display formatting uses `Intl.NumberFormat` only at the UI layer:
  ```ts
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(500)
  // → "₱500.00"
  ```
- Never hardcode ₱ or $ in business logic.
