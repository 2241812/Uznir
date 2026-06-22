import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/currency";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const revalidate = 30;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error("Failed to load profile: " + error.message);
  }

  const role = profile?.role || "customer";
  const name = profile?.display_name || "there";

  // Live counts for the stat cards. These run as the user; RLS scopes everything.
  const isCustomer = role === "customer" || role === "both";
  const isWorker = role === "worker" || role === "both";

  // Customer-side stats
  let openJobs = 0;
  let activeBookings = 0;
  if (isCustomer) {
    const { count } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .eq("status", "open");
    openJobs = count ?? 0;

    const { count: bCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .in("status", ["scheduled", "in_progress"]);
    activeBookings = bCount ?? 0;
  }

  // Worker-side stats
  let pendingBids = 0;
  let wonEarnings = 0;
  if (isWorker) {
    const { count } = await supabase
      .from("bids")
      .select("id", { count: "exact", head: true })
      .eq("worker_id", user.id)
      .eq("status", "pending");
    pendingBids = count ?? 0;

    const { data: accepted } = await supabase
      .from("bids")
      .select("amount")
      .eq("worker_id", user.id)
      .eq("status", "accepted");
    wonEarnings = (accepted ?? []).reduce((sum, b) => sum + Number(b.amount), 0);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Welcome back, {name}</h1>
      <p className="mt-1 text-muted-foreground">
        {role === "worker"
          ? "Here's your worker activity overview."
          : role === "both"
            ? "Here's your activity overview."
            : "Here's your jobs overview."}
      </p>

      {/* Stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isCustomer && (
          <>
            <StatCard label="Open jobs" value={String(openJobs)} href="/my-jobs" />
            <StatCard
              label="Active bookings"
              value={String(activeBookings)}
              href="/chat"
            />
          </>
        )}
        {isWorker && (
          <>
            <StatCard label="Pending bids" value={String(pendingBids)} href="/my-bids" />
            <StatCard
              label="Won bids total"
              value={wonEarnings > 0 ? formatCurrency(wonEarnings) : formatCurrency(0)}
              href="/my-bids"
            />
          </>
        )}
      </div>

      {/* Quick actions */}
      <h2 className="mt-10 text-sm font-semibold text-muted-foreground">Quick actions</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isCustomer && (
          <>
            <QuickActionCard
              href="/post-job"
              title="Post a job"
              description="Describe what you need and find workers nearby"
              icon="📝"
            />
            <QuickActionCard
              href="/my-jobs"
              title="My jobs"
              description="Track your active and past jobs"
              icon="📋"
            />
          </>
        )}
        {isWorker && (
          <>
            <QuickActionCard
              href="/find-work"
              title="Find work"
              description="Browse open jobs and place bids"
              icon="🔍"
            />
            <QuickActionCard
              href="/nearby"
              title="Who's near?"
              description="See customers looking for you nearby"
              icon="📍"
            />
            <QuickActionCard
              href="/my-bids"
              title="My bids"
              description="Track your active bids"
              icon="🤝"
            />
          </>
        )}
        <QuickActionCard
          href="/chat"
          title="Messages"
          description="Chat with customers or workers"
          icon="💬"
        />
        <QuickActionCard
          href="/profile"
          title="Profile"
          description="Update your profile and settings"
          icon="👤"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Link>
  );
}

function QuickActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <span className="text-3xl">{icon}</span>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
