import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGateway } from "@/lib/payments";

// Type for webhook payload metadata
interface XenditPayload {
  metadata?: { bookingId?: string; workerId?: string; [k: string]: unknown };
  [k: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    const gateway = getGateway();
    const event = gateway.webhookVerifier(rawBody, headers);

    if (!event) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Process the event
    const supabase = await createClient();
    const payload = event.payload as XenditPayload;

    console.log(`[Webhook] ${event.event}:`, JSON.stringify(payload));

    // Handle different event types
    switch (event.event) {
      case "invoice.paid":
      case "PAYMENT_SUCCEEDED": {
        // Payment captured — update the ledger
        const bookingId = payload.metadata?.bookingId;
        const chargeId = String(payload.id ?? "");
        const amount = typeof payload.amount === "number" ? payload.amount / 100 : 0;

        if (bookingId) {
          await supabase.from("payments_ledger").update({
            status: "captured",
            provider_charge_id: chargeId,
          }).eq("booking_id", bookingId).eq("status", "pending").eq("direction", "in");
          void amount; // reserved for future reconciliation logic
        }
        break;
      }

      case "disbursement.completed":
      case "DISBURSEMENT_COMPLETED": {
        // Payout completed
        const bookingId = payload.metadata?.bookingId;
        const payoutId = String(payload.id ?? "");

        if (bookingId) {
          await supabase.from("payments_ledger").update({
            status: "paid_out",
            provider_charge_id: payoutId,
          }).eq("booking_id", bookingId).eq("status", "pending").eq("direction", "out");
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
