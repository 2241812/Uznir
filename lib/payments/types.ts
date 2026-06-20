// ─── Payment Gateway Interface ─────────────────────────────────────────────────
// All payment operations go through this interface.
// Implementations: xendit.ts, paymongo.ts
// Never import implementations directly — use getGateway() from index.ts

export type PaymentProvider = "xendit" | "paymongo" | "stripe";

export interface ChargeOptions {
  amount: number;
  currency: string;
  customerId: string;
  bookingId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  paymentMethod: {
    type: "gcash" | "maya" | "card" | "bank" | "other";
    details?: Record<string, string>;
  };
}

export interface ChargeResult {
  chargeId: string;
  status: "pending" | "captured" | "failed";
  checkoutUrl?: string; // Redirect URL for e-wallet authorization
  providerPaymentId?: string;
}

export interface PayoutOptions {
  amount: number;
  currency: string;
  recipient: WorkerRecipient;
  bookingId: string;
  description?: string;
}

export interface WorkerRecipient {
  workerId: string;
  name: string;
  payoutMethod: {
    type: "gcash" | "maya" | "bank" | "other";
    accountNumber: string;
    accountName: string;
  };
}

export interface PayoutResult {
  payoutId: string;
  status: "pending" | "completed" | "failed";
  providerPayoutId?: string;
}

export interface WebhookEvent {
  event: string;
  payload: unknown;
}

export interface PaymentGateway {
  readonly name: PaymentProvider;
  createCharge(options: ChargeOptions): Promise<ChargeResult>;
  createPayout(options: PayoutOptions): Promise<PayoutResult>;
  webhookVerifier(rawBody: string, headers: Record<string, string>): WebhookEvent | null;
}
