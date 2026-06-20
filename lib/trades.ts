/**
 * Trade categories — the canonical reference list used across the app.
 *
 * The source of truth is the `trades` table (seeded in supabase/seed.sql).
 * This constant mirrors the seed so forms and selects can render without a DB round-trip.
 * Always keep these in sync with seed.sql.
 */
export const TRADES = [
  { id: 1, slug: "driver", name: "Driver" },
  { id: 2, slug: "carpenter", name: "Carpenter" },
  { id: 3, slug: "plumber", name: "Plumber" },
  { id: 4, slug: "electrician", name: "Electrician" },
  { id: 5, slug: "courier", name: "Courier / Errands" },
  { id: 6, slug: "cleaner", name: "Cleaner" },
  { id: 7, slug: "handyman", name: "Handyman" },
  { id: 8, slug: "painter", name: "Painter" },
  { id: 9, slug: "gardener", name: "Gardener" },
  { id: 10, slug: "welder", name: "Welder" },
  { id: 11, slug: "mover", name: "Mover" },
  { id: 12, slug: "ac_tech", name: "AC Technician" },
] as const;

export type Trade = (typeof TRADES)[number];

/** Look up a trade's display name by id. Returns undefined if not found. */
export function getTradeName(id: number): string | undefined {
  return TRADES.find((t) => t.id === id)?.name;
}
