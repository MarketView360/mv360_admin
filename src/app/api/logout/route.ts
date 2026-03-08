import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Secure logout endpoint - clears all auth cookies and invalidates session
 */
export async function POST() {
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

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Create response
    const response = NextResponse.json({ success: true });

    // Clear all potentially auth-related cookies
    const authCookiePatterns = ["sb-", "auth", "session", "token"];
    const allCookies = cookieStore.getAll();

    allCookies.forEach((cookie) => {
      if (authCookiePatterns.some(pattern => cookie.name.toLowerCase().includes(pattern))) {
        response.cookies.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}
