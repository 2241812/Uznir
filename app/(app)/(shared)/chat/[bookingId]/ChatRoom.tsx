"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function ChatRoom({
  bookingId,
  currentUserId,
  otherName,
  bookingStatus,
  initialMessages,
}: {
  bookingId: string;
  currentUserId: string;
  otherName: string;
  bookingStatus: string;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, startSending] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Whether the partner is currently typing (broadcast presence).
  const [partnerTyping, setPartnerTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<ReturnType<typeof createClient> extends { channel: (name: string) => infer C } ? C : any>(null);

  // Scroll to bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, partnerTyping]);

  // Subscribe to realtime inserts on this booking's messages.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`chat:${bookingId}`);
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          // Avoid double-inserting our own optimistic message.
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
          // Any incoming message implies the partner stopped typing.
          setPartnerTyping(false);
        }
      )
      // Broadcast typing presence on the same channel.
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, isTyping } = payload.payload as {
          userId: string;
          isTyping: string;
        };
        if (userId !== currentUserId) {
          setPartnerTyping(isTyping === "true");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [bookingId, currentUserId]);

  function broadcastTyping(isTyping: boolean) {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: currentUserId, isTyping: String(isTyping) },
      });
    }
  }

  function handleChange(value: string) {
    setDraft(value);
    // Throttle typing broadcasts: emit "typing" on first keystroke, then
    // "stopped" after 1.5s of inactivity.
    if (value && !typingTimeout.current) {
      broadcastTyping(true);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      broadcastTyping(false);
      typingTimeout.current = null;
    }, 1500);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setError(null);
    const optimisticId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      sender_id: currentUserId,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }
    broadcastTyping(false);

    startSending(async () => {
      const res = await sendMessage(bookingId, body);
      if (!res.success) {
        // Roll back the optimistic message.
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setError(typeof res.error === "string" ? res.error : "Failed to send");
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 flex h-[70vh] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="font-semibold">{otherName}</p>
          {partnerTyping && (
            <p className="text-xs text-muted-foreground">typing…</p>
          )}
        </div>
        <Badge variant="secondary" className="capitalize">
          {bookingStatus.replace("_", " ")}
        </Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No messages yet. Say hello! 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString("en-PH", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      {error && (
        <p className="px-4 pb-1 text-xs text-destructive">{error}</p>
      )}
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="submit"
          size="icon"
          className="rounded-full"
          disabled={!draft.trim() || sending}
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
