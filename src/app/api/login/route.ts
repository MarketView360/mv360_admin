import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit, rateLimitConfigs } from "@/lib/rate-limit";
import { logAuthEvent } from "@/lib/api";

// Admin emails allowed to access the dashboard
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Server-side login endpoint with rate limiting
 * Provides an additional layer of security beyond client-side checks
 */
export async function POST(request: NextRequest) {
  const ip = getIpAddress(request);
  const rateLimitKey = `login:${ip}`;

  // Check rate limit (strict: 5 attempts per minute)
  const rateLimit = checkRateLimit(rateLimitKey, rateLimitConfigs.auth);

  if (!rateLimit.allowed) {
    await logAuthEvent({
      eventType: "brute_force_lockout",
      action: `Rate limit exceeded for IP ${ip}`,
      metadata: { ip, retryAfter: rateLimit.retryAfter },
    });

    return NextResponse.json(
      {
        error: "Too many login attempts. Please try again later.",
        retryAfter: rateLimit.retryAfter,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": rateLimitConfigs.auth.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.resetAt.toString(),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Silent fail for setAll in some contexts
            }
          },
        },
      }
    );

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log failed attempt
      await logAuthEvent({
        eventType: "login_failed",
        action: `Failed login attempt for ${email}`,
        metadata: { email, error: error.message },
      });

      return NextResponse.json(
        { error: "Invalid email or password" },
        {
          status: 401,
          headers: {
            "X-RateLimit-Limit": rateLimitConfigs.auth.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Check admin status
    const isAdmin = checkIsAdmin(data.user);

    if (!isAdmin) {
      // Sign out non-admin users immediately
      await supabase.auth.signOut();

      await logAuthEvent({
        eventType: "access_denied",
        action: `Non-admin access attempt by ${email}`,
        metadata: { email },
      });

      return NextResponse.json(
        { error: "Admin access required" },
        {
          status: 403,
          headers: {
            "X-RateLimit-Limit": rateLimitConfigs.auth.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Success - log and return
    await logAuthEvent({
      eventType: "login_success",
      action: `Successful admin login for ${email}`,
      metadata: { email, userId: data.user.id },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", rateLimitConfigs.auth.maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    response.headers.set("X-RateLimit-Reset", rateLimit.resetAt.toString());

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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

function getIpAddress(request: NextRequest): string {
  // Check various headers for IP address
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (forwardedFor) {
    // Take the first IP in the chain
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to socket IP (will be localhost in development)
  return "unknown";
}
