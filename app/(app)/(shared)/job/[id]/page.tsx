import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/currency";
import { getTradeName } from "@/lib/trades";
import { Badge } from "@/components/ui/badge";
import { BidForm } from "./BidForm";
import { BidList } from "./BidList";
import { MapPin, Wallet, Calendar, ArrowLeft, Gavel } from "lucide-react";

export const metadata: Metadata = {
  title: "Job details",
};

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  trade_id: number | null;
  status: string;
  created_at: string;
  customer_id: string;
  profiles: { display_name: string } | null;
};

type BidRow = {
  id: string;
  amount: number;
  message: string | null;
  status: string;
  created_at: string;
  worker_id: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Current user + role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = me?.role ?? "customer";

  // Fetch the listing. RLS exposes: own listings, open listings, or listings the
  // worker has already bid on. A 404 here means the listing doesn't exist or the
  // user has no right to see it.
  const { data: job, error } = await supabase
    .from("listings")
    .select(
      "id, title, description, budget, trade_id, status, created_at, customer_id, profiles!inner(display_name)"
    )
    .eq("id", id)
    .single<JobRow>();

  if (error || !job) return notFound();

  const isOwner = job.customer_id === user.id;
  const isOpen = job.status === "open";
  const canBid = (role === "worker" || role === "both") && !isOwner && isOpen;

  // If the current user is a worker, check whether they have already bid.
  let alreadyBid = false;
  if (role === "worker" || role === "both") {
    const { data: myBid } = await supabase
      .from("bids")
      .select("id")
      .eq("listing_id", id)
      .eq("worker_id", user.id)
      .limit(1)
      .maybeSingle();
    alreadyBid = !!myBid;
  }

  // Bids — visible to the listing owner. Workers only see their own bid
  // (enforced by RLS on the bids table via the participant pattern).
  const { data: bidsData } = await supabase
    .from("bids")
    .select(
      "id, amount, message, status, created_at, worker_id, profiles!inner(display_name, avatar_url)"
    )
    .eq("listing_id", id)
    .order("created_at", { ascending: true })
    .returns<BidRow[]>();

  const bids = bidsData ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href={isOwner ? "/my-jobs" : "/find-work"}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isOwner ? "Back to my jobs" : "Back to open jobs"}
      </Link>

      {/* Job header */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <Badge
            variant={isOpen ? "default" : "secondary"}
            className="capitalize"
          >
            {job.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {job.trade_id && (
            <Badge variant="outline">{getTradeName(job.trade_id)}</Badge>
          )}
          {job.budget != null && (
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              Budget: {formatCurrency(job.budget)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {job.profiles?.display_name ?? "Customer"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(job.created_at).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {job.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
            {job.description}
          </p>
        )}
      </div>

      {/* Bid form (workers only, listing still open) */}
      {canBid && (
        <div className="mt-8">
          {alreadyBid ? (
            <div className="rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground">
              You&apos;ve already placed a bid on this job. See it below.
            </div>
          ) : (
            <BidForm listingId={id} />
          )}
        </div>
      )}

      {/* Bids */}
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {isOwner
              ? `Bids received (${bids.length})`
              : bids.length > 0
                ? "Your bid"
                : "No bids yet"}
          </h2>
        </div>

        {bids.length > 0 ? (
          <BidList bids={bids} isOwner={isOwner} isOpen={isOpen} />
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {isOwner
              ? "Bids from workers will appear here."
              : "Be the first to bid on this job."}
          </p>
        )}
      </div>
    </div>
  );
}
