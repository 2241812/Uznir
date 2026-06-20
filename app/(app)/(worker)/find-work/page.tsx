import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/currency";
import { TRADES, getTradeName } from "@/lib/trades";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Wallet, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Find work",
};

// Revalidate this page frequently so newly posted jobs appear.
export const revalidate = 30;

// Shape of the joined row returned by Supabase.
// Without a generated Database schema, the supabase-js client types one-to-many
// joins as arrays even for many-to-one relations, so `profiles` is typed as an array.
type OpenListing = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  trade_id: number | null;
  created_at: string;
  profiles: { display_name: string }[] | null;
};

export default async function FindWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ trade?: string; q?: string }>;
}) {
  const params = await searchParams;
  const tradeFilter = params.trade ? Number(params.trade) : null;
  const query = params.q?.trim();

  const supabase = await createClient();

  // The listings RLS policy exposes open listings to all authenticated users,
  // plus any listing the current user owns or has bid on. We filter status=open
  // to surface only jobs still accepting bids.
  let builder = supabase
    .from("listings")
    .select("id, title, description, budget, trade_id, created_at, profiles!inner(display_name)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  if (tradeFilter) {
    builder = builder.eq("trade_id", tradeFilter);
  }

  if (query) {
    // Simple ILIKE search on title + description. PostGIS full-text search
    // (search_vector) is available via the `listings_search` RPC for advanced use.
    builder = builder.or(
      `title.ilike.%${query}%,description.ilike.%${query}%`
    );
  }

  const { data: listings, error } = await builder;

  if (error) {
    console.error("Find work query error:", error);
  }

  const jobs = listings ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Search className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Find work</h1>
          <p className="text-sm text-muted-foreground">
            Open jobs near you — bid on the ones that fit your skills.
          </p>
        </div>
      </div>

      {/* Filters */}
      <form className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="q" className="block text-sm font-medium">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={query ?? ""}
            placeholder="e.g., faucet, painting, move"
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="sm:w-56">
          <label htmlFor="trade" className="block text-sm font-medium">
            Category
          </label>
          <select
            id="trade"
            name="trade"
            defaultValue={tradeFilter ? String(tradeFilter) : ""}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {TRADES.map((trade) => (
              <option key={trade.id} value={trade.id}>
                {trade.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Search className="h-4 w-4" />
          Filter
        </button>
      </form>

      {/* Results count */}
      <p className="mt-6 text-sm text-muted-foreground">
        {jobs.length} open job{jobs.length !== 1 ? "s" : ""}
        {tradeFilter ? ` in ${getTradeName(tradeFilter)}` : ""}
        {query ? ` matching “${query}”` : ""}
      </p>

      {/* Job list */}
      {jobs.length > 0 ? (
        <div className="mt-4 space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/job/${job.id}`}
              className="block rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{job.title}</h3>
                    {job.trade_id && (
                      <Badge variant="secondary">{getTradeName(job.trade_id)}</Badge>
                    )}
                  </div>
                  {job.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {job.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {job.budget != null && (
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5" />
                        {formatCurrency(job.budget)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.profiles?.[0]?.display_name ?? "Customer"}
                    </span>
                    <span className="text-xs">
                      {new Date(job.created_at).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border bg-muted/30 py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">No open jobs found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different category or clear your search filters.
          </p>
        </div>
      )}
    </div>
  );
}
