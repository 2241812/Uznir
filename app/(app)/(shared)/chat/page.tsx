import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Messages",
};

type ConversationRow = {
  id: string;
  status: string;
  updated_at: string;
  last_body: string | null;
  other: { display_name: string }[] | null;
};

// Refresh periodically so newly started bookings/conversations surface.
export const revalidate = 30;

export default async function ChatListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Bookings where the current user is a participant. RLS hides bookings
  // they're not party to, so this is safe without an explicit filter.
  const { data: conversations } = await supabase
    .from("bookings")
    .select("id, status, created_at, customer_id, worker_id")
    .or(`customer_id.eq.${user.id},worker_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const rows: ConversationRow[] = [];

  if (conversations) {
    for (const c of conversations) {
      const otherId = c.customer_id === user.id ? c.worker_id : c.customer_id;

      const [{ data: other }, { data: lastMsg }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", otherId)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("body")
          .eq("booking_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      rows.push({
        id: c.id,
        status: c.status,
        updated_at: c.created_at,
        last_body: lastMsg?.body ?? null,
        other: other ? [{ display_name: other.display_name }] : null,
      });
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Conversations with your booking partners.
      </p>

      {rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border bg-muted/30 py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No conversations yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Once a bid is accepted and a booking is created, you can chat here.
          </p>
        </div>
      ) : (
        <div className="mt-6 divide-y rounded-2xl border bg-card">
          {rows.map((c) => {
            const name = c.other?.[0]?.display_name ?? "Partner";
            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{name}</p>
                    <span className="text-xs capitalize text-muted-foreground">
                      · {c.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {c.last_body ?? "No messages yet. Say hello!"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(c.updated_at).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
