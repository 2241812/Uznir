"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserLocation, RADIUS_OPTIONS, type RadiusKm } from "@/lib/geo";
import { formatCurrency, formatDistance } from "@/lib/utils/currency";
import { StarRating } from "@/components/features/StarRating";
import { MapPin, Clock, Loader2 } from "lucide-react";
import type { NearbyWorker } from "@/lib/supabase/types";

const TRADE_NAMES: Record<number, string> = {
  1: "Driver",
  2: "Carpenter",
  3: "Plumber",
  4: "Electrician",
  5: "Courier / Errands",
  6: "Cleaner",
  7: "Handyman",
  8: "Painter",
  9: "Gardener",
  10: "Welder",
  11: "Mover",
  12: "AC Technician",
};

export default function NearbyPage() {
  const [workers, setWorkers] = useState<NearbyWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState<RadiusKm>(5);
  const [selectedTrade, setSelectedTrade] = useState<number | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  async function searchNearby() {
    setLoading(true);
    setError(null);

    try {
      const loc = location || await getUserLocation();
      setLocation(loc);

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("nearby_workers", {
        p_lat: loc.lat,
        p_lng: loc.lng,
        p_radius_km: radius,
        p_trade_id: selectedTrade,
      });

      if (rpcError) {
        throw rpcError;
      }

      setWorkers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search for workers");
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <MapPin className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Who&apos;s near?</h1>
          <p className="text-sm text-muted-foreground">
            Find available workers in your area
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium">Trade category</label>
          <select
            value={selectedTrade ?? ""}
            onChange={(e) => setSelectedTrade(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All trades</option>
            {Object.entries(TRADE_NAMES).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Distance</label>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value) as RadiusKm)}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {RADIUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Within {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={searchNearby}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          {loading ? "Searching..." : "Find workers"}
        </button>
      </div>

      {location && (
        <p className="mt-2 text-xs text-muted-foreground">
          Using location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {workers.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold">
            {workers.length} worker{workers.length !== 1 ? "s" : ""} found
          </h2>
          {workers.map((worker) => (
            <div
              key={worker.profile_id}
              className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Avatar placeholder */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                {worker.display_name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{worker.display_name}</h3>
                  {worker.rating > 0 && (
                    <StarRating value={worker.rating} size={14} showNumber />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  {worker.hourly_rate && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatCurrency(worker.hourly_rate)}/hr
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {formatDistance(worker.distance_km)}
                  </span>
                </div>
              </div>

              <button disabled className="shrink-0 rounded-lg border border-primary/20 px-4 py-2 text-sm font-medium text-primary opacity-50 cursor-not-allowed">
                View profile (Soon)
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && workers.length === 0 && location && (
        <div className="mt-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No workers found in your area
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try increasing the search radius or choosing a different category
          </p>
        </div>
      )}

      {/* Initial state */}
      {!loading && !error && workers.length === 0 && !location && (
        <div className="mt-16 text-center">
          <p className="text-lg text-muted-foreground">
            Click &ldquo;Find workers&rdquo; to search for available workers near your location.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ll need to allow location access when prompted.
          </p>
        </div>
      )}
    </div>
  );
}
