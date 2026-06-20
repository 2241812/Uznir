import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My jobs",
};

export default function MyJobsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">My jobs</h1>
      <p className="mt-1 text-muted-foreground">
        Track your posted jobs and their status.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border bg-muted/30 py-16">
        <p className="text-lg font-medium text-muted-foreground">
          No jobs posted yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Post your first job to find nearby workers.
        </p>
        <a
          href="/post-job"
          className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Post a job
        </a>
      </div>
    </div>
  );
}
