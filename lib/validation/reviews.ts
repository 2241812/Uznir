import { z } from "zod";

export const createReviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1, "Minimum rating is 1").max(5, "Maximum rating is 5"),
  body: z
    .string()
    .max(1000, "Review must be 1000 characters or less")
    .optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
