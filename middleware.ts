import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public/sw.js, public/workbox-*.js (service worker)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox|manifest|icons|svgs|robots\\.txt|sitemap\\.xml|offline\\.html).*)",
  ],
};
