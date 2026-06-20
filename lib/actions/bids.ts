"use server";

import { createClient } from "@/lib/supabase/server";
import { createBidSchema, type CreateBidInput } from "@/lib/validation/bids";
import { revalidatePath } from "next/headers";

export async function createBid(_input: CreateBidInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const result = createBidSchema.safeParse(_input);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  const { listing_id, amount, message } = result.data;

  // Check worker role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "worker" && profile.role !== "both")) {
    return { success: false, error: "Only workers can place bids" };
  }

  // Check listing is still open
  const { data: listing } = await supabase
    .from("listings")
    .select("id, status")
    .eq("id", listing_id)
    .single();

  if (!listing || listing.status !== "open") {
    return { success: false, error: "Listing is not open for bids" };
  }

  const { error } = await supabase.from("bids").insert({
    listing_id,
    worker_id: user.id,
    amount,
    message,
    status: "pending",
  });

  if (error) {
    // Unique constraint: already bid on this listing
    if (error.code === "23505") {
      return { success: false, error: "You have already bid on this listing" };
    }
    console.error("Create bid error:", error);
    return { success: false, error: "Failed to place bid" };
  }

  revalidatePath(`/job/${listing_id}`);
  revalidatePath("/my-bids");
  return { success: true };
}

export async function acceptBid(bidId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the bid + listing
  const { data: bid, error: bidError } = await supabase
    .from("bids")
    .select("id, listing_id, worker_id, amount, listings!inner(customer_id)")
    .eq("id", bidId)
    .single();

  if (bidError || !bid) {
    return { success: false, error: "Bid not found" };
  }

  // Only the listing's customer can accept
  if ((bid.listings as unknown as { customer_id: string }).customer_id !== user.id) {
    return { success: false, error: "Only the job poster can accept bids" };
  }

  // Mark the bid as accepted
  const { error: updateError } = await supabase
    .from("bids")
    .update({ status: "accepted" })
    .eq("id", bidId);

  if (updateError) {
    console.error("Accept bid error:", updateError);
    return { success: false, error: "Failed to accept bid" };
  }

  // Reject all other bids on this listing
  await supabase
    .from("bids")
    .update({ status: "rejected" })
    .eq("listing_id", bid.listing_id)
    .neq("id", bidId);

  // Update listing status to awarded
  await supabase
    .from("listings")
    .update({ status: "awarded" })
    .eq("id", bid.listing_id);

  // Create the booking
  const { error: bookingError } = await supabase.from("bookings").insert({
    listing_id: bid.listing_id,
    customer_id: user.id,
    worker_id: bid.worker_id,
    final_price: bid.amount,
    status: "scheduled",
  });

  if (bookingError) {
    console.error("Create booking error:", bookingError);
    return { success: false, error: "Failed to create booking" };
  }

  revalidatePath(`/job/${bid.listing_id}`);
  revalidatePath("/my-jobs");
  return { success: true };
}

export async function rejectBid(bidId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("bids")
    .update({ status: "rejected" })
    .eq("id", bidId);

  if (error) {
    return { success: false, error: "Failed to reject bid" };
  }

  revalidatePath("/my-jobs");
  return { success: true };
}
