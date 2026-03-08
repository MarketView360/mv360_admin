import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Admin emails allowed to access the dashboard
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Server-side admin verification API endpoint
 * This provides a secure way for components to verify admin status
 * without relying on client-side checks
 */
export async function GET() {
  try {
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

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { authenticated: false, isAdmin: false, error: "No session" },
        { status: 401 }
      );
    }

    // Check admin status
    const isAdmin = checkIsAdmin(session.user);

    if (!isAdmin) {
      // Log unauthorized access attempt
      try {
        await supabase.from("security_events").insert({
          user_id: session.user.id,
          event_type: "access_denied",
          action: `Non-admin API access attempt to /api/verify-admin`,
          source: "admin_portal_api",
          metadata: {
            email: session.user.email,
            timestamp: new Date().toISOString(),
          },
        });
      } catch {
        // Fire-and-forget logging
      }

      return NextResponse.json(
        { authenticated: true, isAdmin: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Return admin user info ( sanitized )
    return NextResponse.json({
      authenticated: true,
      isAdmin: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        app_metadata: session.user.app_metadata,
      },
    });
  } catch (error) {
    console.error("Admin verification error:", error);
    return NextResponse.json(
      { authenticated: false, isAdmin: false, error: "Internal error" },
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
