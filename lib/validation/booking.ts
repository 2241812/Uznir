import { z } from "zod";

export const createBookingSchema = z.object({
  listing_id: z.string().uuid().optional(),
  worker_id: z.string().uuid(),
  scheduled_at: z.string().datetime().optional(),
  final_price: z.number().min(50).max(100000).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingStatusSchema = z.object({
  booking_id: z.string().uuid(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "disputed"]),
});

export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
