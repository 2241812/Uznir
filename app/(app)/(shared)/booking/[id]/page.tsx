import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking details",
};

export default function BookingDetailPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Booking details</h1>
      <p className="mt-1 text-muted-foreground">
        View booking status, payment, and chat.
      </p>
      <div className="mt-8 text-center text-muted-foreground">
        Booking details will appear here when you have an active booking.
      </div>
    </div>
  );
}
