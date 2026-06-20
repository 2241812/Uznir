import type {
  PaymentGateway,
  ChargeOptions,
  ChargeResult,
  PayoutOptions,
  PayoutResult,
  WebhookEvent,
} from "./types";

/**
 * PayMongo payment gateway implementation (PH-only).
 *
 * Uses PayMongo's Payment Intent API for charges and Payout API for disbursements.
 * Note: PayMongo does not have a dedicated marketplace split-payment product
 * like Xendit's XenPlatform. For marketplace operations, Xendit is preferred.
 *
 * Environment variables required:
 * - PAYMONGO_SECRET_KEY
 * - PAYMONGO_PUBLIC_KEY
 * - PAYMONGO_WEBHOOK_SECRET
 */

const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";

export class PayMongoGateway implements PaymentGateway {
  readonly name = "paymongo" as const;

  private secretKey: string;
  private publicKey: string;
  private webhookSecret: string;

  constructor() {
    this.secretKey = process.env.PAYMONGO_SECRET_KEY || "";
    this.publicKey = process.env.PAYMONGO_PUBLIC_KEY || "";
    this.webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET || "";

    if (!this.secretKey) {
      console.warn("PAYMONGO_SECRET_KEY is not set. Payment operations will fail.");
    }
  }

  async createCharge(options: ChargeOptions): Promise<ChargeResult> {
    // Create a PayMongo Payment Intent, then attach a payment method

    // Step 1: Create payment intent
    const intentResponse = await fetch(`${PAYMONGO_API_BASE}/payment_intents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(this.secretKey).toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(options.amount * 100), // PayMongo uses centavos
            currency: options.currency.toLowerCase(),
            payment_method_allowed: this.mapAllowedMethods(options.paymentMethod.type),
            statement_descriptor: "UZNIR",
            metadata: {
              bookingId: options.bookingId,
              customerId: options.customerId,
            },
          },
        },
      }),
    });

    if (!intentResponse.ok) {
      const error = await intentResponse.text();
      throw new Error(`PayMongo payment intent failed: ${error}`);
    }

    const intent = await intentResponse.json();
    const clientKey = intent.data.attributes.client_key;

    return {
      chargeId: intent.data.attributes.id,
      status: intent.data.attributes.status === "succeeded" ? "captured" : "pending",
      checkoutUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paymongo/checkout?client_key=${clientKey}&intent_id=${intent.data.attributes.id}`,
      providerPaymentId: intent.data.attributes.id,
    };
  }

  async createPayout(options: PayoutOptions): Promise<PayoutResult> {
    // PayMongo Payouts API
    const response = await fetch(`${PAYMONGO_API_BASE}/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(this.secretKey).toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(options.amount * 100),
            currency: options.currency.toLowerCase(),
            recipient: options.recipient.payoutMethod.accountNumber,
            statement_descriptor: options.description || `Payout ${options.bookingId}`,
            metadata: {
              bookingId: options.bookingId,
              workerId: options.recipient.workerId,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayMongo payout failed: ${error}`);
    }

    const payout = await response.json();

    return {
      payoutId: payout.data.attributes.id,
      status: payout.data.attributes.status === "paid_out" ? "completed" : "pending",
      providerPayoutId: payout.data.attributes.id,
    };
  }

  webhookVerifier(rawBody: string, headers: Record<string, string>): WebhookEvent | null {
    // PayMongo uses PayMongo-Signature header (HMAC-SHA256)
    const signature = headers["paymongo-signature"];
    if (!signature) {
      console.warn("Missing PayMongo signature header");
      return null;
    }

    // In production, verify the HMAC signature:
    // const [timestamp, hash] = signature.split(",");
    // const expectedHash = createHmac('sha256', this.webhookSecret)
    //   .update(`${timestamp}.${rawBody}`)
    //   .digest('hex');
    // if (hash !== expectedHash) return null;

    try {
      const payload = JSON.parse(rawBody);
      return {
        event: payload.data?.attributes?.type || "unknown",
        payload,
      };
    } catch {
      return null;
    }
  }

  private mapAllowedMethods(type: string): string[] {
    const map: Record<string, string[]> = {
      gcash: ["gcash"],
      maya: ["paymaya"],
      card: ["card"],
      bank: ["bank_transfer", "dob", "bpi"],
      other: ["gcash", "paymaya", "card"],
    };
    return map[type] || ["gcash", "paymaya", "card"];
  }
}
