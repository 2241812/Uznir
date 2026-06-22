import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Public routes that don't require Supabase or authentication.
 * When Supabase is not configured, only these routes are accessible.
 */
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/auth",
  "/home",
  "/about",
  "/pricing",
  "/_next",
  "/api/webhooks",
  "/favicon",
  "/offline",
];

/**
 * Exact-match public routes (paths that should not use startsWith matching,
 * because "/" as a prefix would match every route).
 */
const EXACT_PUBLIC_ROUTES = ["/"];

function isPublicRoute(pathname: string): boolean {
  if (EXACT_PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, allow public routes and redirect everything else to /login
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublicRoute(request.nextUrl.pathname)) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as never)
        );
      },
    },
  });

  // Refresh the session so it doesn't expire
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login for protected routes
  if (!user && !isPublicRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/signup"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
