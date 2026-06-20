"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { createReview } from "@/lib/actions/reviews";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

export function ReviewForm({
  bookingId,
  subjectId,
  subjectName,
}: {
  bookingId: string;
  subjectId: string;
  subjectName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Please select a star rating");
      return;
    }
    startTransition(async () => {
      const res = await createReview(bookingId, subjectId, rating, body.trim() || undefined);
      if (!res.success) {
        setError(typeof res.error === "string" ? res.error : "Failed to submit review");
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Thanks! Your review has been submitted.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">Rate {subjectName}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        How was your experience? Your rating helps others on Uznir.
      </p>

      {/* Interactive star picker */}
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = (hover || rating) >= star;
          return (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              className="p-0.5"
            >
              <Star
                className={cn(
                  "h-7 w-7 transition-colors",
                  active
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-transparent text-muted-foreground/40 hover:text-muted-foreground"
                )}
              />
            </button>
          );
        })}
        {rating > 0 && (
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
          </span>
        )}
      </div>

      <div className="mt-4">
        <Label htmlFor="review-body">Comment (optional)</Label>
        <textarea
          id="review-body"
          rows={3}
          maxLength={1000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share details about the work quality, punctuality, professionalism..."
          className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <p className="mt-1 text-xs text-muted-foreground">{body.length}/1000</p>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <Button type="submit" className="mt-4" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
