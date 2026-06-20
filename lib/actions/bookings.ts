"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type BookingStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "disputed";

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
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
