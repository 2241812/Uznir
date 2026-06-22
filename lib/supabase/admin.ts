import { createClient as supabaseCreateClient } from "@supabase/supabase-js";

/**
 * Service-role (admin) Supabase client — BYPASSES Row Level Security.
 *
 * Use ONLY server-side, and ONLY where RLS must be bypassed:
 *   - Webhook handlers (no authenticated user, but privileged system action)
 *   - Scheduled jobs / migrations
 *
 * SECURITY RULES:
 *   - NEVER import this from a Client Component or any "use client" file.
 *   - NEVER expose the service role key to the browser.
 *   - Keep every call site auditable: each one mutates data on behalf of the
 *     system, not a user, so the caller must verify the input itself (e.g.
 *     webhook signature, booking status).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Service-role operations require the service role key."
    );
  }

  return supabaseCreateClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // The admin client must not attempt to persist/read sessions.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
