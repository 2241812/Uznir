"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { createBid } from "@/lib/actions/bids";
import { createBidSchema, type CreateBidInput } from "@/lib/validation/bids";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BidFormValues = Omit<CreateBidInput, "listing_id">;

type FieldErrors = Partial<Record<keyof BidFormValues, string>>;

export function BidForm({ listingId }: { listingId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BidFormValues>({
    resolver: zodResolver(
      createBidSchema.omit({ listing_id: true })
    ),
    defaultValues: { amount: 0, message: "" },
  });

  async function onSubmit(values: BidFormValues) {
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    setSuccess(false);

    const res = await createBid({ ...values, listing_id: listingId });

    if (!res.success) {
      if (typeof res.error === "string") {
        setFormError(res.error);
      } else if (res.error && typeof res.error === "object") {
        const mapped: FieldErrors = {};
        for (const [key, msgs] of Object.entries(res.error)) {
          const arr = msgs as string[];
          if (Array.isArray(arr) && arr.length > 0) {
            mapped[key as keyof BidFormValues] = arr[0];
          }
        }
        setFieldErrors(mapped);
      }
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <p className="font-medium">Bid placed!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The customer will be notified. You can track this in{" "}
          <a href="/my-bids" className="underline">
            My bids
          </a>
          .
        </p>
      </div>
    );
  }

  const showError = (key: keyof BidFormValues) =>
    fieldErrors[key] ?? errors[key]?.message;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl border bg-card p-5 shadow-sm"
      noValidate
    >
      <h2 className="text-lg font-semibold">Place a bid</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Make your offer and explain why you&apos;re the right person for the job.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="amount">Your offer (PHP)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="50"
            placeholder="e.g., 450"
            className="mt-1"
            {...register("amount", { valueAsNumber: true })}
          />
          {showError("amount") && (
            <p className="mt-1 text-xs text-destructive">{showError("amount")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="message">Message to customer</Label>
          <textarea
            id="message"
            rows={3}
            placeholder="e.g., I can fix this tomorrow morning. I have 5 years of experience..."
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            {...register("message")}
          />
          {showError("message") && (
            <p className="mt-1 text-xs text-destructive">{showError("message")}</p>
          )}
        </div>
      </div>

      {formError && (
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      <Button type="submit" className="mt-4 w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Placing bid…" : "Submit bid"}
      </Button>
    </form>
  );
}
