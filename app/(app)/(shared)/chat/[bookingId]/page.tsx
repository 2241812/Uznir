import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom } from "./ChatRoom";

export const metadata: Metadata = {
  title: "Chat",
};

type BookingContext = {
  id: string;
  status: string;
  customer_id: string;
  worker_id: string;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default async function ChatPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  // Verify participation + fetch booking context (RLS also enforces this).
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status, customer_id, worker_id")
    .eq("id", bookingId)
    .single<BookingContext>();

  if (bookingError || !booking) return notFound();

  if (booking.customer_id !== user.id && booking.worker_id !== user.id) {
    return notFound();
  }

  // Resolve the other participant's display name for the header.
  const otherId =
    booking.customer_id === user.id ? booking.worker_id : booking.customer_id;
  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", otherId)
    .single();

  // Initial message history (subsequent updates arrive via Realtime).
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Link
        href={`/booking/${bookingId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to booking
      </Link>

      <ChatRoom
        bookingId={bookingId}
        currentUserId={user.id}
        otherName={otherProfile?.display_name ?? "Partner"}
        bookingStatus={booking.status}
        initialMessages={messages ?? []}
      />
    </div>
  );
}
