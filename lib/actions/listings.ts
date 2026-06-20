"use server";

import { createClient } from "@/lib/supabase/server";
import { createListingSchema, type CreateListingInput } from "@/lib/validation/listings";
import { revalidatePath } from "next/cache";

export async function createListing(_input: CreateListingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  const result = createListingSchema.safeParse(_input);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  const { title, description, trade_id, budget, lat, lng } = result.data;

  // Convert lat/lng to PostGIS point (lng first!)
  const { error } = await supabase.from("listings").insert({
    customer_id: user.id,
    title,
    description,
    trade_id,
    budget,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    status: "open",
  });

  if (error) {
    console.error("Create listing error:", error);
    return { success: false, error: "Failed to create listing" };
  }

  revalidatePath("/my-jobs");
  revalidatePath("/home");
  return { success: true };
}

export async function updateListingStatus(listingId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const validStatuses = ["open", "awarded", "in_progress", "done", "cancelled"];
  if (!validStatuses.includes(status)) {
    return { success: false, error: "Invalid status" };
  }

  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .eq("customer_id", user.id);

  if (error) {
    console.error("Update listing status error:", error);
    return { success: false, error: "Failed to update listing" };
  }

  revalidatePath(`/job/${listingId}`);
  revalidatePath("/my-jobs");
  return { success: true };
}

export async function cancelListing(listingId: string) {
  return updateListingStatus(listingId, "cancelled");
}
