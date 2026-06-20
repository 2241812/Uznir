import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="mt-1 text-muted-foreground">
        Manage your account and preferences.
      </p>

      <form className="mt-8 space-y-6">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium">Profile photo</label>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
              ?
            </div>
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Upload photo
            </button>
          </div>
        </div>

        {/* Display name */}
        <div>
          <label className="block text-sm font-medium">Display name</label>
          <input
            type="text"
            placeholder="Your name"
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium">Phone number</label>
          <input
            type="tel"
            placeholder="+63 9XX XXX XXXX"
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Bio (worker) */}
        <div>
          <label className="block text-sm font-medium">Bio</label>
          <textarea
            placeholder="Tell customers about yourself and your skills..."
            rows={3}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Hourly rate (worker) */}
        <div>
          <label className="block text-sm font-medium">Hourly rate (₱)</label>
          <input
            type="number"
            placeholder="e.g., 350"
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
