"use server";

import { createClient } from "@/lib/supabase/server";
import { getGateway, calculatePlatformFee, calculatePayoutAmount } from "@/lib/payments";

export async function initiatePayment(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, customer_id, worker_id, final_price, status")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return { success: false, error: "Booking not found" };
  }

  if (booking.customer_id !== user.id) {
    return { success: false, error: "Only the customer can pay" };
  }

  if (booking.status !== "scheduled" && booking.status !== "in_progress") {
    return { success: false, error: "Booking must be scheduled or in progress" };
  }

  if (!booking.final_price) {
    return { success: false, error: "No price set on booking" };
  }

  const amount = booking.final_price;

  // Idempotency guard: check for an existing active charge on this booking.
  // The partial unique index (one_active_charge_idx) is the DB-level backstop;
  // this check avoids a wasted gateway call.
  const { data: existingCharge } = await supabase
    .from("payments_ledger")
    .select("id, status, provider_charge_id")
    .eq("booking_id", bookingId)
    .eq("direction", "in")
    .in("status", ["pending", "captured"])
    .maybeSingle();

  if (existingCharge) {
    if (existingCharge.status === "captured") {
      return { success: false, error: "Payment has already been captured for this booking" };
    }
    // A pending row exists — the charge is already in flight.
    return {
      success: true,
      message: "Payment already initiated",
      chargeId: existingCharge.provider_charge_id,
    };
  }

  // Record the charge in the ledger (pending)
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from("payments_ledger")
    .insert({
      booking_id: bookingId,
      actor_id: user.id,
      direction: "in",
      amount,
      currency: "PHP",
      provider: "xendit",
      status: "pending",
    })
    .select("id")
    .single();

  if (ledgerError || !ledgerEntry) {
    // 23505 = unique constraint violation from one_active_charge_idx.
    // A concurrent request raced us — return gracefully.
    if (ledgerError?.code === "23505") {
      return { success: false, error: "Payment already in progress for this booking" };
    }
    console.error("Ledger insert error:", ledgerError);
    return { success: false, error: "Failed to record payment" };
  }

  // Create the charge via the payment gateway
  try {
    const gateway = getGateway();
    const chargeResult = await gateway.createCharge({
      amount,
      currency: "PHP",
      customerId: user.id,
      bookingId,
      description: `Payment for booking ${bookingId}`,
      paymentMethod: { type: "gcash" },
    });

    // Update ledger with provider charge ID
    if (chargeResult.providerPaymentId) {
      await supabase
        .from("payments_ledger")
        .update({ provider_charge_id: chargeResult.providerPaymentId })
        .eq("id", ledgerEntry.id);
    }

    return {
      success: true,
      checkoutUrl: chargeResult.checkoutUrl,
      chargeId: chargeResult.chargeId,
    };
  } catch (error) {
    console.error("Payment gateway error:", error);
    // Mark the ledger entry as failed
    await supabase
      .from("payments_ledger")
      .update({ status: "failed" })
      .eq("id", ledgerEntry.id);

    return { success: false, error: "Payment initiation failed" };
  }
}

export async function processPayout(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, worker_id, final_price, status")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return { success: false, error: "Booking not found" };
  }

  if (booking.status !== "completed") {
    return { success: false, error: "Booking must be completed before payout" };
  }

  // Authorization: only the customer may trigger payout review.
  // (In production this would be a platform-only operation via webhook.)
  if (booking.customer_id !== user.id) {
    return { success: false, error: "Only the customer can trigger payouts" };
  }

  if (!booking.final_price) {
    return { success: false, error: "No price set" };
  }

  // Verify a captured payment exists for this booking. No payout without
  // a confirmed charge — prevents money leak on uncompleted/unpaid bookings.
  const { data: capturedCharge } = await supabase
    .from("payments_ledger")
    .select("id, amount")
    .eq("booking_id", bookingId)
    .eq("direction", "in")
    .eq("status", "captured")
    .maybeSingle();

  if (!capturedCharge) {
    return { success: false, error: "No captured payment found for this booking" };
  }

  // Idempotency: check if a payout already exists for this booking.
  // The one_payout_idx is the DB-level backstop.
  const { data: existingPayout } = await supabase
    .from("payments_ledger")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("direction", "out")
    .in("status", ["pending", "paid_out"])
    .maybeSingle();

  if (existingPayout) {
    return { success: false, error: "Payout already initiated for this booking" };
  }

  // Get worker's payout info
  const { data: workerProfile } = await supabase
    .from("profiles")
    .select("id, display_name, phone")
    .eq("id", booking.worker_id)
    .single();

  if (!workerProfile) {
    return { success: false, error: "Worker profile not found" };
  }

  const platformFee = calculatePlatformFee(capturedCharge.amount);
  const payoutAmount = calculatePayoutAmount(capturedCharge.amount);

  // Record platform fee
  await supabase.from("payments_ledger").insert({
    booking_id: bookingId,
    actor_id: null,
    direction: "out",
    amount: platformFee,
    currency: "PHP",
    provider: "platform",
    status: "captured",
  });

  // Record worker payout
  const { data: payoutLedger } = await supabase
    .from("payments_ledger")
    .insert({
      booking_id: bookingId,
      actor_id: booking.worker_id,
      direction: "out",
      amount: payoutAmount,
      currency: "PHP",
      provider: "xendit",
      status: "pending",
    })
    .select("id")
    .single();

  if (!payoutLedger) {
    return { success: false, error: "Failed to record payout" };
  }

  // In production, this would call the actual gateway:
  // const gateway = getGateway();
  // await gateway.createPayout({...});

  return { success: true, payoutAmount, platformFee };
}
