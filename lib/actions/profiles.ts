"use server";

import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema, updateWorkerProfileSchema } from "@/lib/validation/profiles";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: {
  display_name?: string;
  phone?: string;
  avatar_url?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const result = updateProfileSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  const updates: Record<string, unknown> = {};
  if (result.data.display_name !== undefined) updates.display_name = result.data.display_name;
  if (result.data.phone !== undefined) updates.phone = result.data.phone || null;
  if (result.data.avatar_url !== undefined) updates.avatar_url = result.data.avatar_url || null;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error("Update profile error:", error);
    return { success: false, error: "Failed to update profile" };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function updateWorkerProfile(formData: {
  bio?: string;
  hourly_rate?: number;
  is_available?: boolean;
  trades?: number[];
  location?: { lat: number; lng: number };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const result = updateWorkerProfileSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  // Upsert worker profile
  const profileUpdate: Record<string, unknown> = {};
  if (result.data.bio !== undefined) profileUpdate.bio = result.data.bio;
  if (result.data.hourly_rate !== undefined) profileUpdate.hourly_rate = result.data.hourly_rate;
  if (result.data.is_available !== undefined) profileUpdate.is_available = result.data.is_available;
  if (formData.location) {
    profileUpdate.location = `SRID=4326;POINT(${formData.location.lng} ${formData.location.lat})`;
  }

  const { error: upsertError } = await supabase
    .from("worker_profiles")
    .upsert(
      { profile_id: user.id, ...profileUpdate },
      { onConflict: "profile_id" }
    );

  if (upsertError) {
    console.error("Upsert worker profile error:", upsertError);
    return { success: false, error: "Failed to update worker profile" };
  }

  // Update trades if provided
  if (result.data.trades && result.data.trades.length > 0) {
    // Delete existing trades
    await supabase.from("worker_trades").delete().eq("worker_id", user.id);

    // Insert new trades
    const tradeRows = result.data.trades.map((tradeId) => ({
      worker_id: user.id,
      trade_id: tradeId,
    }));

    const { error: tradeError } = await supabase.from("worker_trades").insert(tradeRows);
    if (tradeError) {
      console.error("Update trades error:", tradeError);
    }
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function setRole(role: "customer" | "worker" | "both") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const validRoles = ["customer", "worker", "both"] as const;
  if (!validRoles.includes(role as typeof validRoles[number])) {
    return { success: false, error: "Invalid role" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id);

  if (error) {
    console.error("Set role error:", error);
    return { success: false, error: "Failed to set role" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
