import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "customer";
  const displayName = profile?.display_name || user.email || "User";
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r bg-card lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            U
          </div>
          <span className="text-lg font-bold">Uznir</span>
        </div>
        <nav className="space-y-1 p-4">
          <NavLink href="/dashboard" label="Dashboard" />
          {role === "customer" || role === "both" ? (
            <>
              <NavLink href="/post-job" label="Post a job" />
              <NavLink href="/my-jobs" label="My jobs" />
            </>
          ) : null}
          {role === "worker" || role === "both" ? (
            <>
              <NavLink href="/nearby" label="Who's near?" />
              <NavLink href="/my-bids" label="My bids" />
            </>
          ) : null}
          <NavLink href="/chat" label="Messages" />
          <NavLink href="/profile" label="Profile" />
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-card py-2 lg:hidden">
        <MobileNavLink href="/dashboard" label="Home" icon="🏠" />
        {(role === "worker" || role === "both") && (
          <MobileNavLink href="/nearby" label="Nearby" icon="📍" />
        )}
        {(role === "customer" || role === "both") && (
          <MobileNavLink href="/my-jobs" label="Jobs" icon="📋" />
        )}
        <MobileNavLink href="/chat" label="Chat" icon="💬" />
        <MobileNavLink href="/profile" label="Profile" icon="👤" />
      </nav>

      {/* Main content */}
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {label}
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground"
    >
      <span className="text-xl">{icon}</span>
      {label}
    </Link>
  );
}
