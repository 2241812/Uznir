import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Job details",
};

export default function JobDetailPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Job details</h1>
      <p className="mt-1 text-muted-foreground">
        View job details and bids received.
      </p>
      <div className="mt-8 text-center text-muted-foreground">
        Job detail content will appear here when you post a job.
      </div>
    </div>
  );
}
