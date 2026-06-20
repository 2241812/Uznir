import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-center text-4xl font-bold">Simple, transparent pricing</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
        No upfront costs. No subscription fees. We only earn when you do.
      </p>

      <div className="mt-16 grid gap-8 sm:grid-cols-2">
        {/* For Customers */}
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-bold">For Customers</h2>
          <p className="mt-2 text-muted-foreground">
            Post jobs and hire workers
          </p>
          <div className="mt-6">
            <span className="text-4xl font-bold">Free</span>
            <span className="text-muted-foreground"> to post</span>
          </div>
          <ul className="mt-6 space-y-3">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Post unlimited jobs
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Receive bids from nearby workers
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> In-app chat with workers
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Secure payment via GCash/Maya/Card
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Rate and review workers
            </li>
          </ul>
        </div>

        {/* For Workers */}
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-bold">For Workers</h2>
          <p className="mt-2 text-muted-foreground">
            Find jobs and earn money
          </p>
          <div className="mt-6">
            <span className="text-4xl font-bold">10%</span>
            <span className="text-muted-foreground"> platform fee</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Only when you complete a job and get paid
          </p>
          <ul className="mt-6 space-y-3">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Set your own rates
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Browse jobs near you
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Bid on jobs that match your skills
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Get paid via GCash/Maya/Bank
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Build your reputation
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
