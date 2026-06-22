"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateBookingStatusSchema } from "@/lib/validation/booking";

type BookingStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "disputed";

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const result = updateBookingStatusSchema.safeParse({ booking_id: bookingId, status });
  if (!result.success) {
    return { success: false, error: "Invalid input" };
  }

  // Verify the user is a participant
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, customer_id, worker_id, listing_id, status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: "Booking not found" };
  }

  if (booking.customer_id !== user.id && booking.worker_id !== user.id) {
    return { success: false, error: "Not a participant" };
  }

  // Validate transitions
  const validTransitions: Record<string, BookingStatus[]> = {
    scheduled: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled", "disputed"],
    completed: [],
    cancelled: [],
    disputed: ["completed", "cancelled"],
  };

  const allowed = validTransitions[booking.status] || [];
  if (!allowed.includes(status)) {
    return { success: false, error: `Cannot transition from ${booking.status} to ${status}` };
  }

  // Role-based authorization: not all participants can drive all transitions.
  // - Only the WORKER may mark work as completed or in-progress.
  // - Only the CUSTOMER may cancel an active booking.
  // - Either party may dispute.
  const isWorker = booking.worker_id === user.id;
  const isCustomer = booking.customer_id === user.id;

  if (status === "completed" && !isWorker) {
    return { success: false, error: "Only the worker can mark the job as completed" };
  }
  if (status === "in_progress" && !isWorker) {
    return { success: false, error: "Only the worker can mark the job as in progress" };
  }
  if (status === "cancelled" && !isCustomer) {
    return { success: false, error: "Only the customer can cancel a booking" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  if (error) {
    console.error("Update booking error:", error);
    return { success: false, error: "Failed to update booking" };
  }

  // If booking completed, update listing status too
  if (status === "completed" && booking.listing_id) {
    await supabase
      .from("listings")
      .update({ status: "done" })
      .eq("id", booking.listing_id);
  }

  // If cancelled, reopen the listing (if it exists)
  if (status === "cancelled" && booking.listing_id) {
    await supabase
      .from("listings")
      .update({ status: "open" })
      .eq("id", booking.listing_id);
  }

  revalidatePath(`/booking/${bookingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-jobs");
  revalidatePath("/my-bids");
  return { success: true };
}
