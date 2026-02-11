import { createBrowserClient } from "@supabase/ssr";

// ─── Browser client (use in client components) ──────────────────────────────

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for client components — safe because browser clients are stateless
let _browser: ReturnType<typeof createBrowserSupabase> | null = null;
export function getBrowserSupabase() {
  if (!_browser) _browser = createBrowserSupabase();
  return _browser;
}

// Convenience alias kept for backward-compat with existing client-side code
export const supabase = new Proxy(
  {} as ReturnType<typeof createBrowserSupabase>,
  {
    get(_target, prop) {
      return (getBrowserSupabase() as unknown as Record<string, unknown>)[
        prop as string
      ];
    },
  }
);

// ─── Helper: get the admin site URL for redirects ────────────────────────────

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
