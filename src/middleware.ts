import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Admin emails allowed to access the dashboard
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Routes that require admin authentication
const PROTECTED_ROUTES = ["/overview", "/analytics", "/users", "/data-quality", "/genesis", "/logging", "/revenue", "/tickers", "/content"];

// Routes that require admin check (but user might already be logged in)
const AUTH_ROUTES = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Create Supabase client for session management
  let response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get current session
  const { data: { session } } = await supabase.auth.getSession();

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

  // Handle unauthenticated users
  if (!session) {
    if (isProtectedRoute) {
      // Redirect to login with return URL
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // User is authenticated - check admin status for protected routes
  if (session && (isProtectedRoute || pathname === "/" || pathname === "")) {
    const isAdmin = checkIsAdmin(session.user);

    if (!isAdmin) {
      // Log unauthorized access attempt
      try {
        await supabase.from("security_events").insert({
          user_id: session.user.id,
          event_type: "access_denied",
          action: `Non-admin access attempt to ${pathname}`,
          source: "admin_portal_middleware",
          metadata: {
            email: session.user.email,
            pathname,
            timestamp: new Date().toISOString(),
          },
        });
      } catch {
        // Fire-and-forget logging
      }

      // Sign out non-admin users
      await supabase.auth.signOut();

      // Redirect to login with error
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "admin_access_required");
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already logged in and trying to access login page, redirect to overview
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  // Add security headers to all responses
  response = addSecurityHeaders(response, request);

  return response;
}

function checkIsAdmin(user: { email?: string | null; app_metadata?: Record<string, any> }): boolean {
  if (!user) return false;

  // Check app_metadata (set via Supabase service role)
  const meta = user.app_metadata;
  if (meta?.role === "admin" || meta?.roles?.includes("admin")) return true;

  // Fallback: check against allowed admin emails from env var
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;

  return false;
}

function addSecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const isDev = process.env.NODE_ENV === "development";

  // Get backend URL from env
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const genesisUrl = process.env.NEXT_PUBLIC_GENESIS_URL || backendUrl;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  // Extract hostname for CSP
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  };

  const backendHost = getHostname(backendUrl);
  const genesisHost = getHostname(genesisUrl);
  const supabaseHost = getHostname(supabaseUrl);

  const connectSources = [
    "'self'",
    supabaseHost || "https://*.supabase.co",
    backendHost || "http://localhost:*",
  ];

  if (genesisHost && genesisHost !== backendHost) {
    connectSources.push(genesisHost);
  }

  // Content Security Policy - restrict resource loading
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${connectSources.join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      !isDev ? "upgrade-insecure-requests" : "",
    ]
      .filter(Boolean)
      .join("; ")
  );

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // XSS Protection (legacy but still useful)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy - limit referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy - disable unnecessary features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // HSTS - enforce HTTPS in production
  if (!isDev) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
