import type { PaymentGateway } from "./types";
import { XenditGateway } from "./xendit";
import { PayMongoGateway } from "./paymongo";

/**
 * Factory function that returns the active payment gateway.
 * Reads NEXT_PUBLIC_PAYMENT_GATEWAY env var.
 *
 * Usage:
 *   import { getGateway } from "@/lib/payments";
 *   const gateway = getGateway();
 *   const charge = await gateway.createCharge({ ... });
 */
export function getGateway(): PaymentGateway {
  const provider = process.env.PAYMENT_GATEWAY || "xendit";

  switch (provider) {
    case "xendit":
      return new XenditGateway();
    case "paymongo":
      return new PayMongoGateway();
    case "stripe":
      throw new Error(
        "Stripe gateway not yet implemented. See lib/payments/stripe.ts stub."
      );
    default:
      console.warn(`Unknown payment gateway "${provider}", falling back to xendit.`);
      return new XenditGateway();
  }
}

/**
 * Calculate platform commission from a charge amount.
 * Rate is configurable via PLATFORM_COMMISSION_RATE env var (as decimal, e.g. 0.10 = 10%).
 */
export function calculatePlatformFee(amount: number): number {
  const rate = parseFloat(process.env.PLATFORM_COMMISSION_RATE || "0.10");
  return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate worker payout after platform commission.
 */
export function calculatePayoutAmount(chargeAmount: number): number {
  return Math.round((chargeAmount - calculatePlatformFee(chargeAmount)) * 100) / 100;
}

export { type PaymentGateway, type PaymentProvider, type ChargeOptions, type ChargeResult, type PayoutOptions, type PayoutResult, type WebhookEvent } from "./types";
