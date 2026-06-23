import { redirect } from "next/navigation";

export default async function HomePage() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  } catch {
    // Supabase not configured — show public home page
  }

  redirect("/home");
}
