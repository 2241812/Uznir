"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRole } from "@/lib/actions/profiles";
import { Loader2 } from "lucide-react";

type RoleChoice = "customer" | "worker" | "both";

const CHOICES: { role: RoleChoice; icon: string; title: string; description: string }[] = [
  {
    role: "customer",
    icon: "🔍",
    title: "I need help (Customer)",
    description: "Post jobs and find nearby workers",
  },
  {
    role: "worker",
    icon: "🛠️",
    title: "I want to work (Worker)",
    description: "Offer your skills and find jobs",
  },
  {
    role: "both",
    icon: "🔄",
    title: "Both",
    description: "Post jobs and offer your skills",
  },
];

export function RoleSelectForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSelect(role: RoleChoice) {
    setError(null);
    startTransition(async () => {
      const res = await setRole(role);
      if (!res.success) {
        setError(typeof res.error === "string" ? res.error : "Failed to set role");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {CHOICES.map((choice) => {
        const busy = pending;
        return (
          <button
            key={choice.role}
            type="button"
            disabled={busy}
            onClick={() => handleSelect(choice.role)}
            className="flex w-full items-center gap-4 rounded-xl border p-4 text-left hover:bg-muted transition-colors disabled:opacity-50"
          >
            <span className="text-2xl">{choice.icon}</span>
            <div className="flex-1">
              <p className="font-semibold">{choice.title}</p>
              <p className="text-sm text-muted-foreground">{choice.description}</p>
            </div>
            {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </button>
        );
      })}
    </div>
  );
}
