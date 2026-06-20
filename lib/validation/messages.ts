import { z } from "zod";

export const createMessageSchema = z.object({
  booking_id: z.string().uuid(),
  body: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be 2000 characters or less"),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
