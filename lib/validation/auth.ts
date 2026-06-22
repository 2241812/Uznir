import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  display_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be 50 characters or less"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be 128 characters or less"),
});

export type SignupInput = z.infer<typeof signupSchema>;
