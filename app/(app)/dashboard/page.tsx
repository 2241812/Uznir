import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user?.id)
    .single();

  const role = profile?.role || "customer";
  const name = profile?.display_name || "there";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">
        Welcome back, {name}
      </h1>
      <p className="mt-1 text-muted-foreground">
        {role === "worker"
          ? "Here's your worker activity overview."
          : role === "both"
          ? "Here's your activity overview."
          : "Here's your jobs overview."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {role !== "worker" && (
          <QuickActionCard
            href="/post-job"
            title="Post a job"
            description="Describe what you need and find workers nearby"
            icon="📝"
          />
        )}
        {role !== "worker" && (
          <QuickActionCard
            href="/my-jobs"
            title="My jobs"
            description="Track your active and past jobs"
            icon="📋"
          />
        )}
        {role !== "customer" && (
          <QuickActionCard
            href="/nearby"
            title="Who's near?"
            description="Find jobs in your area"
            icon="📍"
          />
        )}
        {role !== "customer" && (
          <QuickActionCard
            href="/my-bids"
            title="My bids"
            description="Track your active bids"
            icon="🤝"
          />
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

      <div className="mt-12 rounded-2xl border bg-muted/30 p-8 text-center">
        <p className="text-muted-foreground">
          This dashboard will show your recent activity, active bookings, and stats
          once you start using Uznir.
        </p>
      </div>
    </div>
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
