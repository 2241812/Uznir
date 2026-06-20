import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold">About Uznir</h1>
      <div className="mt-8 space-y-6 text-lg leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">Uznir</strong> means &ldquo;who&rsquo;s near?&rdquo; — and that&rsquo;s
          exactly what we do. We connect people who need odd jobs done with skilled,
          trusted workers in their area.
        </p>
        <p>
          Whether you need a driver for a quick trip, a carpenter to fix a door, a
          plumber for a leaky faucet, or someone to run an errand — Uznir helps you
          find the right person, fast.
        </p>
        <p>
          For workers, Uznir is a way to find jobs on your terms. Set your hourly rate,
          choose your trades, and get connected with customers near you. No recruitment
          fees, no middlemen — just direct connections.
        </p>
        <h2 className="text-2xl font-bold text-foreground">Our values</h2>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            <strong className="text-foreground">Trust</strong> — Ratings, reviews, and
            verification build a community you can rely on.
          </li>
          <li>
            <strong className="text-foreground">Fairness</strong> — Workers set their own
            rates. Customers choose the best bid.
          </li>
          <li>
            <strong className="text-foreground">Accessibility</strong> — Built for
            everyone, from smartphones to feature phones. Works on low data.
          </li>
          <li>
            <strong className="text-foreground">Security</strong> — Payments are held in
            escrow until the job is done. Your money is safe.
          </li>
        </ul>
      </div>
    </div>
  );
}
