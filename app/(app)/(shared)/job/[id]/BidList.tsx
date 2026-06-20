"use client";

import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { acceptBid, rejectBid } from "@/lib/actions/bids";
import { formatCurrency } from "@/lib/utils/currency";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Bid = {
  id: string;
  amount: number;
  message: string | null;
  status: string;
  created_at: string;
  worker_id: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

export function BidList({
  bids,
  isOwner,
  isOpen,
}: {
  bids: Bid[];
  isOwner: boolean;
  isOpen: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept(bidId: string) {
    setPendingId(bidId);
    setError(null);
    const res = await acceptBid(bidId);
    setPendingId(null);
    if (!res.success) {
      setError(typeof res.error === "string" ? res.error : "Failed to accept bid");
      return;
    }
    // acceptBid creates a booking and revalidates; refresh to reflect awarded state.
    router.refresh();
  }

  async function handleReject(bidId: string) {
    setPendingId(bidId);
    setError(null);
    const res = await rejectBid(bidId);
    setPendingId(null);
    if (!res.success) {
      setError(typeof res.error === "string" ? res.error : "Failed to reject bid");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-3">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {bids.map((bid) => {
        const busy = pendingId === bid.id;
        return (
          <div key={bid.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {bid.profiles?.display_name?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="font-medium">
                    {bid.profiles?.display_name ?? "Worker"}
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    {formatCurrency(bid.amount)}
                  </p>
                  {bid.message && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {bid.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(bid.created_at).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Badge
                  variant={
                    bid.status === "accepted"
                      ? "default"
                      : bid.status === "rejected"
                        ? "secondary"
                        : "outline"
                  }
                  className="capitalize"
                >
                  {bid.status}
                </Badge>

                {/* Owner controls — only visible while listing is open and this bid is pending */}
                {isOwner && isOpen && bid.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(bid.id)}
                      disabled={busy}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(bid.id)}
                      disabled={busy}
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
