"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { MapPin, Loader2 } from "lucide-react";
import { createListing } from "@/lib/actions/listings";
import { createListingSchema, type CreateListingInput } from "@/lib/validation/listings";
import { getUserLocation } from "@/lib/geo";
import { TRADES } from "@/lib/trades";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FieldErrors = Partial<Record<keyof CreateListingInput, string>>;

export function PostJobForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: "",
      description: "",
      trade_id: 0,
      budget: 0,
      lat: 0,
      lng: 0,
    },
  });

  async function handleUseLocation() {
    setLocating(true);
    setFormError(null);
    try {
      const { lat, lng } = await getUserLocation();
      setValue("lat", lat, { shouldValidate: true });
      setValue("lng", lng, { shouldValidate: true });
      setLocationLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not get your location.");
    } finally {
      setLocating(false);
    }
  }

  async function onSubmit(values: CreateListingInput) {
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const res = await createListing(values);

    if (!res.success) {
      // Action returns either a flat error string or a fieldErrors object
      if (typeof res.error === "string") {
        setFormError(res.error);
      } else if (res.error && typeof res.error === "object") {
        const mapped: FieldErrors = {};
        for (const [key, msgs] of Object.entries(res.error)) {
          const arr = msgs as string[];
          if (Array.isArray(arr) && arr.length > 0) {
            mapped[key as keyof CreateListingInput] = arr[0];
          }
        }
        setFieldErrors(mapped);
      }
      setSubmitting(false);
      return;
    }

    router.push("/my-jobs");
  }

  // Merge RHF errors with action-returned field errors (action wins if present)
  const showError = (key: keyof CreateListingInput) => fieldErrors[key] ?? errors[key]?.message;

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <Label htmlFor="title">Job title</Label>
        <Input
          id="title"
          placeholder="e.g., Fix leaking kitchen faucet"
          className="mt-1"
          {...register("title")}
        />
        {showError("title") && (
          <p className="mt-1 text-xs text-destructive">{showError("title")}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          placeholder="Include details like what's broken, when you need it done, any special requirements..."
          rows={4}
          className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("description")}
        />
        {showError("description") && (
          <p className="mt-1 text-xs text-destructive">{showError("description")}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="trade_id">Category</Label>
          <Select
            onValueChange={(val) => setValue("trade_id", Number(val), { shouldValidate: true })}
          >
            <SelectTrigger id="trade_id" className="mt-1">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {TRADES.map((trade) => (
                <SelectItem key={trade.id} value={String(trade.id)}>
                  {trade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showError("trade_id") && (
            <p className="mt-1 text-xs text-destructive">{showError("trade_id")}</p>
          )}
        </div>

        <div>
          <Label htmlFor="budget">Budget (PHP)</Label>
          <Input
            id="budget"
            type="number"
            step="0.01"
            min="50"
            placeholder="e.g., 500"
            className="mt-1"
            {...register("budget", { valueAsNumber: true })}
          />
          {showError("budget") && (
            <p className="mt-1 text-xs text-destructive">{showError("budget")}</p>
          )}
        </div>
      </div>

      <div>
        <Label>Location</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          We&apos;ll use your current location. You can adjust it before posting.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-2"
          onClick={handleUseLocation}
          disabled={locating}
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          {locating ? "Locating…" : "Use my current location"}
        </Button>
        {locationLabel && (
          <p className="mt-2 text-xs text-muted-foreground">Pinned at {locationLabel}</p>
        )}
        {showError("lat") && <p className="mt-1 text-xs text-destructive">{showError("lat")}</p>}
        {showError("lng") && <p className="mt-1 text-xs text-destructive">{showError("lng")}</p>}
      </div>

      {formError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Posting…" : "Post job"}
      </Button>
    </form>
  );
}
