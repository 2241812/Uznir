import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "My bids",
};

export const revalidate = 30;

type MyBidRow = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  listing_id: string;
  listings: {
    id: string;
    title: string;
    budget: number | null;
    status: string;
  }[] | null;
};

const bidStatusVariant: Record<string, "default" | "secondary" | "outline"> = {
  pending: "outline",
  accepted: "default",
  rejected: "secondary",
};

export default async function MyBidsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // My bids + the listing they're on. RLS on bids restricts to worker_id = me
  // (plus any bid where I'm the customer viewing the listing).
  const { data: bids, error } = await supabase
    .from("bids")
    .select(
      "id, amount, status, created_at, listing_id, listings(id, title, budget, status)"
    )
    .eq("worker_id", user.id)
    .order("created_at", { ascending: false })
    .returns<MyBidRow[]>();

  if (error) {
    throw new Error("Failed to fetch bids: " + error.message);
  }

  // Accepted bids that became bookings — for earnings summary.
  const { data: acceptedBids } = await supabase
    .from("bids")
    .select("amount")
    .eq("worker_id", user.id)
    .eq("status", "accepted");

  const totalAccepted = (acceptedBids ?? []).reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My bids</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your bids and their status.
          </p>
        </div>
        <Link
          href="/find-work"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Search className="h-4 w-4" />
          Find jobs
        </Link>
      </div>

      {/* Earnings summary */}
      {totalAccepted > 0 && (
        <div className="mt-6 rounded-xl border bg-primary/5 p-5">
          <p className="text-sm text-muted-foreground">Won bids total</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {formatCurrency(totalAccepted)}
          </p>
        </div>
      )}

      {!bids || bids.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border bg-muted/30 py-16">
          <p className="text-lg font-medium text-muted-foreground">
            No bids placed yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse open jobs near you and start bidding.
          </p>
          <Link
            href="/find-work"
            className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Find jobs
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bids.map((bid) => {
            const listing = bid.listings?.[0];
            const bookingHref = listing ? `/booking?listing=${listing.id}` : null;
            return (
              <Link
                key={bid.id}
                href={listing ? `/job/${listing.id}` : "#"}
                className="block rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {listing?.title ?? "Listing removed"}
                      </h3>
                      <Badge variant={bidStatusVariant[bid.status] ?? "outline"} className="capitalize">
                        Bid {bid.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5" />
                        Your bid: {formatCurrency(bid.amount)}
                      </span>
                      {listing?.budget != null && (
                        <span>Budget: {formatCurrency(listing.budget)}</span>
                      )}
                      <span className="text-xs">
                        {new Date(bid.created_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {bid.status === "accepted" && bookingHref && (
                      <p className="mt-2 text-xs font-medium text-primary">
                        Accepted! See your booking →
                      </p>
                    )}
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
