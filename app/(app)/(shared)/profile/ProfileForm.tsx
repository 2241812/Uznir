"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2 } from "lucide-react";
import { updateProfile, updateWorkerProfile, setRole } from "@/lib/actions/profiles";
import { updateProfileSchema, updateWorkerProfileSchema } from "@/lib/validation/profiles";
import { TRADES } from "@/lib/trades";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WorkerFields = {
  bio: string | null;
  hourly_rate: number | null;
  is_available: boolean;
};

type ProfileFormValues = {
  display_name: string;
  phone: string;
  avatar_url: string;
};

type WorkerFormValues = {
  bio: string;
  hourly_rate: number;
  is_available: boolean;
  trades: number[];
};

export function ProfileForm({
  displayName,
  phone,
  avatarUrl,
  role,
  worker,
  currentTrades,
}: {
  displayName: string;
  phone: string;
  avatarUrl: string;
  role: string;
  worker: WorkerFields | null;
  currentTrades: number[];
}) {
  const router = useRouter();
  const [savingProfile, startProfileSave] = useTransition();
  const [savingWorker, startWorkerSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedWorker, setSavedWorker] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState<Set<number>>(
    new Set(currentTrades)
  );

  const isWorker = role === "worker" || role === "both";

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      display_name: displayName,
      phone: phone,
      avatar_url: avatarUrl,
    },
  });

  const {
    register: registerWorker,
    handleSubmit: handleWorkerSubmit,
    setValue: setWorkerValue,
    watch: watchWorker,
    formState: { errors: workerErrors },
  } = useForm<WorkerFormValues>({
    resolver: zodResolver(updateWorkerProfileSchema),
    defaultValues: {
      bio: worker?.bio ?? "",
      hourly_rate: worker?.hourly_rate ?? 0,
      is_available: worker?.is_available ?? true,
      trades: currentTrades,
    },
  });

  const available = watchWorker("is_available");

  function toggleTrade(id: number) {
    setSelectedTrades((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setWorkerValue("trades", Array.from(next), { shouldValidate: true });
      return next;
    });
  }

  async function onProfileSubmit(values: ProfileFormValues) {
    setError(null);
    setSavedProfile(false);
    startProfileSave(async () => {
      const res = await updateProfile({
        display_name: values.display_name,
        phone: values.phone,
        avatar_url: values.avatar_url,
      });
      if (!res.success) {
        setError(typeof res.error === "string" ? res.error : "Failed to save profile");
        return;
      }
      setSavedProfile(true);
      router.refresh();
    });
  }

  async function onWorkerSubmit(values: WorkerFormValues) {
    setError(null);
    setSavedWorker(false);
    startWorkerSave(async () => {
      const res = await updateWorkerProfile({
        bio: values.bio,
        hourly_rate: values.hourly_rate,
        is_available: values.is_available,
        trades: values.trades,
      });
      if (!res.success) {
        setError(typeof res.error === "string" ? res.error : "Failed to save worker profile");
        return;
      }
      setSavedWorker(true);
      router.refresh();
    });
  }

  async function handleRoleChange(nextRole: "customer" | "worker" | "both") {
    setError(null);
    startProfileSave(async () => {
      const res = await setRole(nextRole);
      if (!res.success) {
        setError(typeof res.error === "string" ? res.error : "Failed to change role");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Role switcher */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Account role</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Switch how you use Uznir. This controls which menus and features you see.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["customer", "worker", "both"] as const).map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={role === r ? "default" : "outline"}
              disabled={savingProfile}
              onClick={() => handleRoleChange(r)}
              className="capitalize"
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* Basic profile */}
      <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Basic info</h2>

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="display_name">Display name</Label>
              <Input id="display_name" className="mt-1" {...registerProfile("display_name")} />
              {profileErrors.display_name && (
                <p className="mt-1 text-xs text-destructive">
                  {profileErrors.display_name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+63 9XX XXX XXXX"
                className="mt-1"
                {...registerProfile("phone")}
              />
              {profileErrors.phone && (
                <p className="mt-1 text-xs text-destructive">{profileErrors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                type="url"
                placeholder="https://..."
                className="mt-1"
                {...registerProfile("avatar_url")}
              />
              {profileErrors.avatar_url && (
                <p className="mt-1 text-xs text-destructive">
                  {profileErrors.avatar_url.message}
                </p>
              )}
            </div>
          </div>

          <Button type="submit" className="mt-4" disabled={savingProfile}>
            {savingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : savedProfile ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : null}
            {savedProfile ? "Saved" : "Save info"}
          </Button>
        </div>
      </form>

      {/* Worker profile (only for workers) */}
      {isWorker && (
        <form onSubmit={handleWorkerSubmit(onWorkerSubmit)} className="space-y-6">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Worker profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This is what customers see when searching for workers.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  rows={3}
                  placeholder="Tell customers about yourself and your skills..."
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...registerWorker("bio")}
                />
                {workerErrors.bio && (
                  <p className="mt-1 text-xs text-destructive">{workerErrors.bio.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="hourly_rate">Hourly rate (PHP)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="50"
                  placeholder="e.g., 350"
                  className="mt-1"
                  {...registerWorker("hourly_rate", { valueAsNumber: true })}
                />
                {workerErrors.hourly_rate && (
                  <p className="mt-1 text-xs text-destructive">
                    {workerErrors.hourly_rate.message}
                  </p>
                )}
              </div>

              {/* Availability toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={available ?? true}
                  onChange={(e) =>
                    setWorkerValue("is_available", e.target.checked, {
                      shouldValidate: true,
                    })
                  }
                />
                Available for new jobs
              </label>

              {/* Trades */}
              <div>
                <Label>Trades you offer</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select all categories you can work in.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TRADES.map((trade) => {
                    const active = selectedTrades.has(trade.id);
                    return (
                      <button
                        key={trade.id}
                        type="button"
                        onClick={() => toggleTrade(trade.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input hover:bg-muted"
                        }`}
                      >
                        {trade.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Button type="submit" className="mt-4" disabled={savingWorker}>
              {savingWorker ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedWorker ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : null}
              {savedWorker ? "Saved" : "Save worker profile"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
