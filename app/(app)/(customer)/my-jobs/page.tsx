import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/currency";
import { getTradeName } from "@/lib/trades";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "My jobs",
};

export const revalidate = 30;

type MyJobRow = {
  id: string;
  title: string;
  status: string;
  budget: number | null;
  trade_id: number | null;
  created_at: string;
  bids: { id: string }[] | null;
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  open: "default",
  awarded: "secondary",
  in_progress: "secondary",
  done: "outline",
  cancelled: "outline",
};

export default async function MyJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Own listings + the bid count per listing. RLS restricts to customer_id = me.
  const { data: jobs, error } = await supabase
    .from("listings")
    .select("id, title, status, budget, trade_id, created_at, bids(id)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .returns<MyJobRow[]>();

  if (error) {
    throw new Error("Failed to fetch jobs: " + error.message);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your posted jobs and their status.
          </p>
        </div>
        <Link
          href="/post-job"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Post a job
        </Link>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border bg-muted/30 py-16">
          <p className="text-lg font-medium text-muted-foreground">
            No jobs posted yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Post your first job to find nearby workers.
          </p>
          <Link
            href="/post-job"
            className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Post a job
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {jobs.map((job) => {
            const bidCount = job.bids?.length ?? 0;
            return (
              <Link
                key={job.id}
                href={`/job/${job.id}`}
                className="block rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{job.title}</h3>
                      <Badge variant={statusVariant[job.status] ?? "outline"} className="capitalize">
                        {job.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {job.trade_id && <span>{getTradeName(job.trade_id)}</span>}
                      {job.budget != null && (
                        <span className="inline-flex items-center gap-1">
                          <Wallet className="h-3.5 w-3.5" />
                          {formatCurrency(job.budget)}
                        </span>
                      )}
                      <span>
                        {bidCount} bid{bidCount !== 1 ? "s" : ""}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
