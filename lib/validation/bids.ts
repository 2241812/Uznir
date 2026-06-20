import { z } from "zod";

export const createBidSchema = z.object({
  listing_id: z.string().uuid(),
  amount: z
    .number()
    .min(50, "Minimum bid is ₱50")
    .max(100000, "Maximum bid is ₱100,000"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(500, "Message must be 500 characters or less"),
});

export type CreateBidInput = z.infer<typeof createBidSchema>;

export const updateBidStatusSchema = z.object({
  bid_id: z.string().uuid(),
  status: z.enum(["accepted", "rejected"]),
});

export type UpdateBidStatusInput = z.infer<typeof updateBidStatusSchema>;
