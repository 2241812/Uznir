import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
};

export default function ChatListPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="mt-1 text-muted-foreground">
        Your conversations with customers and workers.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border bg-muted/30 py-16">
        <p className="text-lg font-medium text-muted-foreground">
          No messages yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Messages appear here when you have an active booking with someone.
        </p>
      </div>
    </div>
  );
}
