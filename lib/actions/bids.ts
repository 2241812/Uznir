"use server";

import { createClient } from "@/lib/supabase/server";
import { createBidSchema, type CreateBidInput, updateBidStatusSchema } from "@/lib/validation/bids";
import { revalidatePath } from "next/cache";

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

  // Check listing is still open AND not owned by this user (no self-bidding).
  // Selecting customer_id lets us enforce worker_id != customer_id at the
  // application layer as well; the RLS policy is the DB-level backstop.
  const { data: listing } = await supabase
    .from("listings")
    .select("id, status, customer_id, budget")
    .eq("id", listing_id)
    .single();

  if (!listing || listing.status !== "open") {
    return { success: false, error: "Listing is not open for bids" };
  }

  if (listing.customer_id === user.id) {
    return { success: false, error: "You cannot bid on your own listing" };
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

  const result = updateBidStatusSchema.safeParse({ bid_id: bidId, status: "accepted" });
  if (!result.success) {
    return { success: false, error: "Invalid bid ID" };
  }

  // Get the bid + listing
  const { data: bid, error: bidError } = await supabase
    .from("bids")
    .select("id, listing_id, worker_id, amount, status, listings!inner(customer_id, status)")
    .eq("id", bidId)
    .single();

  if (bidError || !bid) {
    return { success: false, error: "Bid not found" };
  }

  const listing = bid.listings as unknown as { customer_id: string; status: string };

  // Only the listing's customer can accept
  if (listing.customer_id !== user.id) {
    return { success: false, error: "Only the job poster can accept bids" };
  }

  // Idempotency: the listing must still be open (not already awarded).
  if (listing.status !== "open") {
    return { success: false, error: "This job is no longer accepting bids" };
  }

  if (bid.status !== "pending") {
    return { success: false, error: "This bid is no longer pending" };
  }

  // STEP 1 — Create the booking FIRST.
  // If this fails, nothing else has been mutated, so the listing stays open
  // and the customer can retry. The unique index on bookings (from the
  // hardening migration) is the DB-level backstop against double-accept.
  const { error: bookingError } = await supabase.from("bookings").insert({
    listing_id: bid.listing_id,
    customer_id: user.id,
    worker_id: bid.worker_id,
    final_price: bid.amount,
    status: "scheduled",
  });

  if (bookingError) {
    // 23505 = unique violation. If we added a unique(listing_id) constraint
    // on active bookings, this means another accept raced us — treat as
    // already awarded rather than a hard failure.
    if (bookingError.code === "23505") {
      return { success: false, error: "This job has already been awarded" };
    }
    console.error("Create booking error:", bookingError);
    return { success: false, error: "Failed to create booking" };
  }

  // STEP 2 — Mark the bid accepted. Failure here is recoverable: the booking
  // exists, so we still report success. Log for ops follow-up.
  const { error: updateError } = await supabase
    .from("bids")
    .update({ status: "accepted" })
    .eq("id", bidId);

  if (updateError) {
    console.error("Accept bid: failed to mark bid accepted (booking still created):", updateError);
  }

  // STEP 3 — Reject all other bids + award the listing. These are cosmetic
  // for correctness (the listing is functionally taken once the booking
  // exists) but matter for the UI. Errors are logged, not fatal.
  const { error: rejectError } = await supabase
    .from("bids")
    .update({ status: "rejected" })
    .eq("listing_id", bid.listing_id)
    .neq("id", bidId)
    .eq("status", "pending");

  if (rejectError) {
    console.error("Accept bid: failed to reject other bids:", rejectError);
  }

  const { error: awardError } = await supabase
    .from("listings")
    .update({ status: "awarded" })
    .eq("id", bid.listing_id);

  if (awardError) {
    console.error("Accept bid: failed to award listing:", awardError);
  }

  revalidatePath(`/job/${bid.listing_id}`);
  revalidatePath("/my-jobs");
  revalidatePath("/my-bids");
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

  const result = updateBidStatusSchema.safeParse({ bid_id: bidId, status: "rejected" });
  if (!result.success) {
    return { success: false, error: "Invalid bid ID" };
  }

  // Authorization: only the listing owner may reject a bid. (A worker who
  // wants to withdraw can do so, but we don't expose that path in the UI yet.)
  const { data: bid, error: fetchError } = await supabase
    .from("bids")
    .select("id, status, listings!inner(customer_id)")
    .eq("id", bidId)
    .single();

  if (fetchError || !bid) {
    return { success: false, error: "Bid not found" };
  }

  const listing = bid.listings as unknown as { customer_id: string };
  if (listing.customer_id !== user.id) {
    return { success: false, error: "Only the job poster can reject bids" };
  }

  // Never reject an already-accepted bid — that would desync the bid from
  // the booking created by acceptBid.
  if (bid.status === "accepted") {
    return { success: false, error: "Cannot reject an already-accepted bid" };
  }

  const { error } = await supabase
    .from("bids")
    .update({ status: "rejected" })
    .eq("id", bidId);

  if (error) {
    return { success: false, error: "Failed to reject bid" };
  }

  revalidatePath("/my-jobs");
  revalidatePath(`/job/${bid.listings ? (bid.listings as unknown as { id?: string }).id ?? "" : ""}`);
  return { success: true };
}
