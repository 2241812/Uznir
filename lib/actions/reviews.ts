"use server";

import { createClient } from "@/lib/supabase/server";
import { createReviewSchema } from "@/lib/validation/reviews";
import { revalidatePath } from "next/headers";

export async function createReview(bookingId: string, subjectId: string, rating: number, body?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const result = createReviewSchema.safeParse({ booking_id: bookingId, rating, body });
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  // Verify booking is completed and user is a participant
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, worker_id, status")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.status !== "completed") {
    return { success: false, error: "Booking must be completed to leave a review" };
  }

  if (booking.customer_id !== user.id && booking.worker_id !== user.id) {
    return { success: false, error: "Not a participant of this booking" };
  }

  // Check if already reviewed
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("author_id", user.id)
    .single();

  if (existing) {
    return { success: false, error: "You have already reviewed this booking" };
  }

  const { error } = await supabase.from("reviews").insert({
    booking_id: bookingId,
    author_id: user.id,
    subject_id,
    rating: result.data.rating,
    body: result.data.body || null,
  });

  if (error) {
    console.error("Create review error:", error);
    return { success: false, error: "Failed to create review" };
  }

  // Worker rating is updated automatically by the trigger

  revalidatePath(`/booking/${bookingId}`);
  revalidatePath("/profile");
  return { success: true };
}
