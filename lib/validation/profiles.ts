import { z } from "zod";

export const roleSchema = z.enum(["customer", "worker", "both"]);

export const updateProfileSchema = z.object({
  display_name: z.string().min(2, "Name must be at least 2 characters").max(50),
  phone: z
    .string()
    .regex(/^\+63\s?\d{10,11}$/, "Enter a valid PH phone number (e.g., +63 9XX XXX XXXX)")
    .optional()
    .or(z.literal("")),
  avatar_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateWorkerProfileSchema = z.object({
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  hourly_rate: z
    .number()
    .min(50, "Minimum rate is ₱50/hour")
    .max(10000, "Maximum rate is ₱10,000/hour")
    .optional(),
  is_available: z.boolean().optional(),
  trades: z.array(z.number()).optional(),
  location: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  }).optional(),
});

export type UpdateWorkerProfileInput = z.infer<typeof updateWorkerProfileSchema>;
