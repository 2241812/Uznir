import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post a job",
};

export default function PostJobPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Post a job</h1>
      <p className="mt-1 text-muted-foreground">
        Describe what you need and workers near you will see it.
      </p>

      <form className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium">Job title</label>
          <input
            type="text"
            placeholder="e.g., Fix leaking kitchen faucet"
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            placeholder="Include details like what's broken, when you need it done, any special requirements..."
            rows={4}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Category</label>
            <select className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select a category</option>
              <option value="1">Driver</option>
              <option value="2">Carpenter</option>
              <option value="3">Plumber</option>
              <option value="4">Electrician</option>
              <option value="5">Courier / Errands</option>
              <option value="6">Cleaner</option>
              <option value="7">Handyman</option>
              <option value="8">Painter</option>
              <option value="9">Gardener</option>
              <option value="10">Welder</option>
              <option value="11">Mover</option>
              <option value="12">AC Technician</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Budget (₱)</label>
            <input
              type="number"
              placeholder="e.g., 500"
              className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Location</label>
          <p className="mt-1 text-xs text-muted-foreground">
            We&apos;ll use your current location. You can adjust it.
          </p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            📍 Use my current location
          </button>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Post job
        </button>
      </form>
    </div>
  );
}
