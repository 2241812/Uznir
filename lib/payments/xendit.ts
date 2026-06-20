import type {
  PaymentGateway,
  ChargeOptions,
  ChargeResult,
  PayoutOptions,
  PayoutResult,
  WebhookEvent,
} from "./types";

/**
 * Xendit XenPlatform payment gateway implementation.
 *
 * Uses Xendit's Invoice API for charges and Disbursement API for payouts.
 * XenPlatform supports marketplace split-payments natively.
 *
 * Environment variables required:
 * - XENDIT_SECRET_KEY
 * - XENDIT_WEBHOOK_SECRET
 * - XENDIT_BUSINESS_ID
 */

const XENDIT_API_BASE = "https://api.xendit.co";
const XENDIT_INVOICES_PATH = "/v2/invoices";
const XENDIT_DISBURSEMENTS_PATH = "/disbursements";

export class XenditGateway implements PaymentGateway {
  readonly name = "xendit" as const;

  private secretKey: string;
  private webhookSecret: string;
  private businessId: string;

  constructor() {
    this.secretKey = process.env.XENDIT_SECRET_KEY || "";
    this.webhookSecret = process.env.XENDIT_WEBHOOK_SECRET || "";
    this.businessId = process.env.XENDIT_BUSINESS_ID || "";

    if (!this.secretKey) {
      console.warn("XENDIT_SECRET_KEY is not set. Payment operations will fail.");
    }
  }

  async createCharge(options: ChargeOptions): Promise<ChargeResult> {
    // Create a Xendit Invoice for the charge
    // XenPlatform handles the marketplace split automatically

    const response = await fetch(`${XENDIT_API_BASE}${XENDIT_INVOICES_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`,
      },
      body: JSON.stringify({
        external_id: `uznir-charge-${options.bookingId}-${Date.now()}`,
        amount: Math.round(options.amount * 100), // Xendit uses smallest currency unit
        currency: options.currency,
        customer: {
          given_names: options.customerId,
          email: `${options.customerId}@uznir.app`, // Placeholder; real email from profile
        },
        items: [
          {
            name: options.description || `Booking ${options.bookingId}`,
            price: Math.round(options.amount * 100),
            quantity: 1,
          },
        ],
        success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${options.bookingId}?payment=success`,
        failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${options.bookingId}?payment=failed`,
        metadata: {
          bookingId: options.bookingId,
          customerId: options.customerId,
          platform: "uznir",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Xendit charge failed: ${error}`);
    }

    const invoice = await response.json();

    return {
      chargeId: invoice.id,
      status: invoice.status === "PAID" ? "captured" : "pending",
      checkoutUrl: invoice.invoice_url,
      providerPaymentId: invoice.payment_id,
    };
  }

  async createPayout(options: PayoutOptions): Promise<PayoutResult> {
    // Create a Xendit Disbursement to pay the worker

    const response = await fetch(`${XENDIT_API_BASE}${XENDIT_DISBURSEMENTS_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`,
      },
      body: JSON.stringify({
        external_id: `uznir-payout-${options.bookingId}-${Date.now()}`,
        amount: Math.round(options.amount * 100),
        currency: options.currency,
        destination_account_number: options.recipient.payoutMethod.accountNumber,
        destination_account_holder_name: options.recipient.payoutMethod.accountName,
        channel_code: this.mapChannelCode(options.recipient.payoutMethod.type),
        description: options.description || `Payout for booking ${options.bookingId}`,
        metadata: {
          bookingId: options.bookingId,
          workerId: options.recipient.workerId,
          platform: "uznir",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Xendit payout failed: ${error}`);
    }

    const disbursement = await response.json();

    return {
      payoutId: disbursement.id,
      status: disbursement.status === "COMPLETED" ? "completed" : "pending",
      providerPayoutId: disbursement.id,
    };
  }

  webhookVerifier(rawBody: string, headers: Record<string, string>): WebhookEvent | null {
    // Verify Xendit webhook signature
    // Xendit uses a callback verification token
    const callbackToken = headers["x-callback-token"];
    if (!callbackToken || callbackToken !== this.webhookSecret) {
      console.warn("Invalid Xendit webhook callback token");
      return null;
    }

    try {
      const payload = JSON.parse(rawBody);
      return {
        event: payload.event || payload.status || "unknown",
        payload,
      };
    } catch {
      return null;
    }
  }

  private mapChannelCode(type: string): string {
    const map: Record<string, string> = {
      gcash: "GCASH",
      maya: "PAYMAYA",
      bank: "BCA", // Placeholder — real bank routing needed
      other: "PH_BANK",
    };
    return map[type] || "PH_BANK";
  }
}
