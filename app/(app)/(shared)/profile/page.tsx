import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = {
  title: "Profile",
};

type WorkerProfileRow = {
  bio: string | null;
  hourly_rate: number | null;
  is_available: boolean;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, phone, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error("Failed to load profile: " + error.message);
  }

  const role = profile?.role ?? "customer";
  const isWorker = role === "worker" || role === "both";

  // Worker-specific fields (optional).
  let worker: WorkerProfileRow | null = null;
  let currentTrades: number[] = [];
  if (isWorker) {
    const { data: wp } = await supabase
      .from("worker_profiles")
      .select("bio, hourly_rate, is_available")
      .eq("profile_id", user.id)
      .maybeSingle<WorkerProfileRow>();
    worker = wp;

    const { data: wt } = await supabase
      .from("worker_trades")
      .select("trade_id")
      .eq("worker_id", user.id);
    currentTrades = (wt ?? []).map((t) => t.trade_id);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account and preferences.
      </p>

      <div className="mt-8">
        <ProfileForm
          displayName={profile?.display_name ?? ""}
          phone={profile?.phone ?? ""}
          avatarUrl={profile?.avatar_url ?? ""}
          role={role}
          worker={worker}
          currentTrades={currentTrades}
        />
      </div>
    </div>
  );
}
