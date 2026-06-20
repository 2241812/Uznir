import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/home" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              U
            </div>
            <span className="text-2xl font-bold">Uznir</span>
          </Link>
        </div>
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
