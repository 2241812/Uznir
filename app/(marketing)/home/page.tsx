import Link from "next/link";
import { MapPin, Users, MessageCircle, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Find trusted workers{" "}
            <span className="text-primary">near you</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Drivers, carpenters, plumbers, electricians, cleaners — available now in
            your area. Post a job, get bids, and hire in minutes.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            >
              <MapPin className="h-5 w-5" />
              Find a worker
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-primary/20 bg-background px-8 py-4 text-lg font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              Start earning
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">How it works</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
            Four simple steps to get your job done.
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={i}
                className="relative rounded-2xl border bg-card p-6 text-center shadow-sm"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {step.icon}
                </div>
                <div className="mt-4 text-sm font-semibold text-primary">Step {i + 1}</div>
                <h3 className="mt-1 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trades */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">What do you need help with?</h2>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {trades.map((trade) => (
              <div
                key={trade.name}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <span className="text-2xl">{trade.icon}</span>
                <span className="font-medium">{trade.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="mt-4 text-muted-foreground">
            Whether you need help or want to earn, Uznir connects you with the right people
            in your area.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const steps = [
  {
    icon: <MapPin className="h-6 w-6" />,
    title: "Post your job",
    description: "Describe what you need, set your budget, and share your location.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Get bids",
    description: "Workers near you see your job and send their offers.",
  },
  {
    icon: <MessageCircle className="h-6 w-6" />,
    title: "Chat and choose",
    description: "Review bids, chat with workers, and pick the best fit.",
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    title: "Get it done",
    description: "The worker completes the job. Pay securely through the app.",
  },
];

const trades = [
  { name: "Driver", icon: "🚗" },
  { name: "Carpenter", icon: "🪚" },
  { name: "Plumber", icon: "🔧" },
  { name: "Electrician", icon: "⚡" },
  { name: "Courier / Errands", icon: "📦" },
  { name: "Cleaner", icon: "🧹" },
  { name: "Handyman", icon: "🛠️" },
  { name: "Painter", icon: "🎨" },
  { name: "Gardener", icon: "🌿" },
  { name: "Welder", icon: "🔥" },
  { name: "Mover", icon: " boxes" },
  { name: "AC Technician", icon: "❄️" },
];
