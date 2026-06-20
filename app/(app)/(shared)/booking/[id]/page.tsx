import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/currency";
import { BookingActions } from "./BookingActions";
import { ReviewForm } from "./ReviewForm";
import { StarRating } from "@/components/features/StarRating";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Wallet, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Booking details",
};

type BookingRow = {
  id: string;
  status: string;
  final_price: number | null;
  scheduled_at: string | null;
  created_at: string;
  customer_id: string;
  worker_id: string;
  listing_id: string | null;
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      "id, status, final_price, scheduled_at, created_at, customer_id, worker_id, listing_id"
    )
    .eq("id", id)
    .single<BookingRow>();

  if (error || !booking) return notFound();

  if (booking.customer_id !== user.id && booking.worker_id !== user.id) {
    return notFound();
  }

  const isCustomer = booking.customer_id === user.id;
  const otherId = isCustomer ? booking.worker_id : booking.customer_id;
  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", otherId)
    .maybeSingle();

  // Resolve listing title if the booking is tied to one.
  let listingTitle: string | null = null;
  if (booking.listing_id) {
    const { data: listing } = await supabase
      .from("listings")
      .select("title")
      .eq("id", booking.listing_id)
      .maybeSingle();
    listingTitle = listing?.title ?? null;
  }

  // Payment ledger entries for this booking (visible to participants via RLS).
  const { data: ledger } = await supabase
    .from("payments_ledger")
    .select("id, direction, amount, provider, status, created_at")
    .eq("booking_id", id)
    .order("created_at", { ascending: true });

  // Reviews: if completed, show existing reviews + (if the user hasn't yet) a form.
  let myReviewExists = false;
  let reviews: { id: string; rating: number; body: string | null; author_id: string }[] = [];
  if (booking.status === "completed") {
    const { data: reviewCheck } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", id)
      .eq("author_id", user.id)
      .maybeSingle();
    myReviewExists = !!reviewCheck;

    const { data: reviewRows } = await supabase
      .from("reviews")
      .select("id, rating, body, author_id")
      .eq("booking_id", id)
      .order("created_at", { ascending: true });
    reviews = reviewRows ?? [];
  }

  const statusSteps = ["scheduled", "in_progress", "completed"];
  const currentStepIndex = statusSteps.indexOf(booking.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/chat"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">
            {listingTitle ?? "Booking"}
          </h1>
          <Badge
            variant={booking.status === "completed" ? "default" : "secondary"}
            className="capitalize"
          >
            {booking.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>
            {isCustomer ? "Worker" : "Customer"}:{" "}
            <span className="font-medium text-foreground">
              {otherProfile?.display_name ?? "Partner"}
            </span>
          </span>
          {booking.final_price != null && (
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              {formatCurrency(booking.final_price)}
            </span>
          )}
          {booking.scheduled_at && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(booking.scheduled_at).toLocaleString("en-PH", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Lifecycle stepper */}
      {booking.status !== "cancelled" && booking.status !== "disputed" && (
        <div className="mt-6 flex items-center gap-2">
          {statusSteps.map((step, i) => {
            const reached = i <= currentStepIndex;
            return (
              <div key={step} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    reached
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-xs capitalize ${
                    reached ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.replace("_", " ")}
                </span>
                {i < statusSteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      i < currentStepIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Chat link */}
      <Link
        href={`/chat/${booking.id}`}
        className="mt-6 flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4" />
          Open chat
        </span>
        <span className="text-sm text-muted-foreground">→</span>
      </Link>

      {/* Actions: status transitions + payment */}
      <BookingActions
        bookingId={booking.id}
        status={booking.status}
        isCustomer={isCustomer}
        finalPrice={booking.final_price}
      />

      {/* Payment history */}
      {ledger && ledger.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold">Payment history</h2>
          <div className="mt-2 divide-y rounded-xl border bg-card">
            {ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 text-sm"
              >
                <div>
                  <p className="font-medium capitalize">
                    {entry.direction === "in" ? "Payment in" : "Payout out"} ·{" "}
                    {entry.provider ?? "gateway"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(entry.amount)}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {entry.status.replace("_", " ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews: shown when booking is completed */}
      {booking.status === "completed" && (
        <div className="mt-6 space-y-4">
          <h2 className="text-sm font-semibold">Reviews</h2>

          {/* Existing reviews */}
          {reviews.length > 0 && (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} />
                    <span className="text-xs text-muted-foreground">
                      {r.author_id === user.id ? "Your review" : "Review"}
                    </span>
                  </div>
                  {r.body && <p className="mt-2 text-sm">{r.body}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Review form (if user hasn't reviewed yet) */}
          {!myReviewExists && (
            <ReviewForm
              bookingId={booking.id}
              subjectId={otherId}
              subjectName={otherProfile?.display_name ?? "your partner"}
            />
          )}
        </div>
      )}
    </div>
  );
}
