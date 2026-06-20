"use server";

import { createClient } from "@/lib/supabase/server";
import { createMessageSchema } from "@/lib/validation/messages";

export async function sendMessage(bookingId: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const result = createMessageSchema.safeParse({ booking_id: bookingId, body });
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  // Verify user is a participant
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, customer_id, worker_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: "Booking not found" };
  }

  if (booking.customer_id !== user.id && booking.worker_id !== user.id) {
    return { success: false, error: "Not a participant of this booking" };
  }

  const { error } = await supabase.from("messages").insert({
    booking_id: bookingId,
    sender_id: user.id,
    body: result.data.body,
  });

  if (error) {
    console.error("Send message error:", error);
    return { success: false, error: "Failed to send message" };
  }

  return { success: true };
}

export async function getMessages(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Not authenticated" };
  }

  // Verify participation (RLS also enforces this)
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .or(`customer_id.eq.${user.id},worker_id.eq.${user.id}`)
    .single();

  if (!booking) {
    return { data: null, error: "Not a participant" };
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: "Failed to fetch messages" };
  }

  return { data, error: null };
}
