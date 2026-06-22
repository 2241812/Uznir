import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGateway } from "@/lib/payments";

// Type for webhook payload metadata
interface XenditPayload {
  id?: string;
  amount?: number;
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

    // Use the admin (service-role) client — webhooks run without an
    // authenticated user session, so the regular RLS-enforced client
    // cannot write to payments_ledger (policies were locked down).
    const supabase = createAdminClient();
    const payload = event.payload as XenditPayload;

    // Handle different event types
    switch (event.event) {
      case "invoice.paid":
      case "PAYMENT_SUCCEEDED": {
        const bookingId = payload.metadata?.bookingId;
        const chargeId = String(payload.id ?? "");
        // Xendit Invoice webhook returns amount in major currency unit (PHP pesos)
        const paidAmount =
          typeof payload.amount === "number" ? payload.amount : 0;

        if (!bookingId) {
          console.warn("[Webhook] invoice.paid missing bookingId in metadata");
          break;
        }

        // Verify the booking exists and is not cancelled before capturing.
        const { data: booking } = await supabase
          .from("bookings")
          .select("id, status, final_price")
          .eq("id", bookingId)
          .single();

        if (!booking) {
          console.warn(`[Webhook] booking ${bookingId} not found`);
          break;
        }

        if (booking.status === "cancelled") {
          console.warn(
            `[Webhook] booking ${bookingId} is cancelled — ignoring captured payment. Refund should be handled externally.`
          );
          break;
        }

        // Amount validation: reject if paid amount differs from expected.
        if (booking.final_price && paidAmount > 0) {
          if (Math.abs(paidAmount - booking.final_price) > 1) {
            // Allow ±₱1 tolerance for rounding
            console.error(
              `[Webhook] AMOUNT MISMATCH: expected ${booking.final_price}, got ${paidAmount} for booking ${bookingId}`
            );
            // Still capture but log loudly — manual reconciliation needed.
            // In production, you might mark as `disputed` instead.
          }
        }

        // Capture the pending ledger row (idempotent: only matches `pending`)
        const { data: updated } = await supabase
          .from("payments_ledger")
          .update({
            status: "captured",
            provider_charge_id: chargeId,
          })
          .eq("booking_id", bookingId)
          .eq("status", "pending")
          .eq("direction", "in")
          .select("id")
          .single();

        if (!updated) {
          console.warn(
            `[Webhook] No pending 'in' ledger row found for booking ${bookingId} — already captured or missing`
          );
        }

        break;
      }

      case "disbursement.completed":
      case "DISBURSEMENT_COMPLETED": {
        const bookingId = payload.metadata?.bookingId;
        const payoutId = String(payload.id ?? "");

        if (!bookingId) {
          console.warn("[Webhook] disbursement.completed missing bookingId");
          break;
        }

        const { data: updated } = await supabase
          .from("payments_ledger")
          .update({
            status: "paid_out",
            provider_charge_id: payoutId,
          })
          .eq("booking_id", bookingId)
          .eq("status", "pending")
          .eq("direction", "out")
          .select("id")
          .single();

        if (!updated) {
          console.warn(
            `[Webhook] No pending 'out' ledger row found for booking ${bookingId} — already paid_out or missing`
          );
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
