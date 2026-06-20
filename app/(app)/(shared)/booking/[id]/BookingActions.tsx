"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBookingStatus } from "@/lib/actions/bookings";
import { initiatePayment } from "@/lib/actions/payments";
import { formatCurrency } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Check, X, CreditCard, AlertTriangle } from "lucide-react";

type Props = {
  bookingId: string;
  status: string;
  isCustomer: boolean;
  finalPrice: number | null;
};

export function BookingActions({ bookingId, status, isCustomer, finalPrice }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function transition(next: "in_progress" | "completed" | "cancelled") {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await updateBookingStatus(bookingId, next);
      if (!res.success) {
        setError(typeof res.error === "string" ? res.error : "Failed to update booking");
      }
      router.refresh();
    });
  }

  async function pay() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await initiatePayment(bookingId);
      if (!res.success) {
        setError(typeof res.error === "string" ? res.error : "Payment failed");
        return;
      }
      if (res.checkoutUrl) {
        // Redirect to the gateway's hosted checkout (GCash/Maya).
        window.location.href = res.checkoutUrl;
      } else {
        setInfo(
          "Payment initiated. You'll be notified once it's confirmed."
        );
        router.refresh();
      }
    });
  }

  // Terminal states have no actions.
  if (status === "completed" || status === "cancelled") {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          {info}
        </div>
      )}

      {/* Customer: pay (escrow the funds) */}
      {isCustomer && finalPrice != null && status !== "completed" && (
        <Button onClick={pay} disabled={pending} className="w-full" size="lg">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {pending ? "Processing…" : `Pay ${formatCurrency(finalPrice)} (GCash/Maya)`}
        </Button>
      )}

      {/* Status transitions */}
      <div className="flex flex-wrap gap-2">
        {status === "scheduled" && (
          <Button
            variant="default"
            onClick={() => transition("in_progress")}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Mark in progress
          </Button>
        )}

        {status === "in_progress" && (
          <Button
            variant="default"
            onClick={() => transition("completed")}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Mark completed
          </Button>
        )}

        {(status === "scheduled" || status === "in_progress") && (
          <Button
            variant="outline"
            onClick={() => transition("cancelled")}
            disabled={pending}
          >
            <X className="h-4 w-4" />
            Cancel booking
          </Button>
        )}
      </div>
    </div>
  );
}
