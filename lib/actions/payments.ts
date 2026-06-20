"use server";

import { createClient } from "@/lib/supabase/server";
import { getGateway, calculatePlatformFee } from "@/lib/payments";

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

  // This should typically be triggered by a webhook when the booking
  // is marked completed, but can also be called manually.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, worker_id, final_price, status")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.status !== "completed") {
    return { success: false, error: "Booking must be completed" };
  }

  if (!booking.final_price) {
    return { success: false, error: "No price set" };
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

  const payoutAmount = booking.final_price - calculatePlatformFee(booking.final_price);
  const platformFee = calculatePlatformFee(booking.final_price);

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
