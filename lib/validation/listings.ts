import { z } from "zod";

export const createListingSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be 100 characters or less"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .optional(),
  trade_id: z.number().positive("Select a trade category"),
  budget: z
    .number()
    .min(50, "Minimum budget is ₱50")
    .max(100000, "Maximum budget is ₱100,000"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingStatusSchema = z.object({
  listing_id: z.string().uuid(),
  status: z.enum(["open", "awarded", "in_progress", "done", "cancelled"]),
});

export type UpdateListingStatusInput = z.infer<typeof updateListingStatusSchema>;
