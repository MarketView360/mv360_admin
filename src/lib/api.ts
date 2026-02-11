import { supabase } from "@/lib/supabase";

// ─── Overview Stats ───────────────────────────────────────────────────────────

export async function fetchOverviewStats() {
  const [companies, priceRows, users, syncLogs] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("price_data").select("id", { count: "exact", head: true }),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("genesis_sync_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  return {
    totalCompanies: companies.count ?? 0,
    totalPriceRows: priceRows.count ?? 0,
    totalUsers: users.count ?? 0,
    recentSyncs: syncLogs.data ?? [],
  };
}

// ─── Genesis Engine ───────────────────────────────────────────────────────────

export async function fetchSyncLogs(limit = 50) {
  const { data, error } = await supabase
    .from("genesis_sync_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function fetchUsers() {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Data Quality ─────────────────────────────────────────────────────────────

export async function fetchDataQualityMetrics() {
  const [staleCompanies, missingMetrics, recentPrices] = await Promise.all([
    supabase
      .from("companies")
      .select("id, ticker, name, last_updated")
      .lt("last_updated", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(20),
    supabase
      .from("companies")
      .select("id, ticker, name")
      .not("id", "in", `(SELECT company_id FROM company_metrics_ttm)`)
      .limit(20),
    supabase
      .from("price_data")
      .select("id", { count: "exact", head: true })
      .gte("date", new Date(Date.now() - 86400000).toISOString().split("T")[0]),
  ]);

  return {
    staleCompanies: staleCompanies.data ?? [],
    missingMetrics: missingMetrics.data ?? [],
    recentPriceCount: recentPrices.count ?? 0,
  };
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

export async function fetchUserSignupsByDay(days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ─── Logging ──────────────────────────────────────────────────────────────────

export async function fetchSecurityEvents(limit = 100) {
  const { data, error } = await supabase
    .from("security_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Admin Auth Logging ──────────────────────────────────────────────────────

export type AuthEventType =
  | "login_success"
  | "login_failed"
  | "access_denied"
  | "logout"
  | "session_timeout"
  | "brute_force_lockout";

export async function logAuthEvent(params: {
  userId?: string | null;
  eventType: AuthEventType;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.from("security_events").insert({
      user_id: params.userId ?? null,
      event_type: params.eventType,
      action: params.action,
      source: "admin_portal",
      metadata: {
        ...params.metadata,
        timestamp: new Date().toISOString(),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
    });
  } catch {
    // Fire-and-forget — never block the UI for logging
  }
}

export async function fetchAdminAuthLogs(limit = 200) {
  const { data, error } = await supabase
    .from("security_events")
    .select("*")
    .eq("source", "admin_portal")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Revenue (placeholder — reads from a revenue table if it exists) ─────────

export async function fetchRevenueData() {
  // Placeholder: when you add a subscriptions/payments table, query it here.
  // For now returns mock structure.
  return {
    mrr: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    churnRate: 0,
    revenueByMonth: [] as { month: string; revenue: number }[],
  };
}

// ─── Backend API calls (for triggering genesis, etc.) ─────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function triggerGenesisPipeline(
  type: "daily" | "weekly",
  token: string
) {
  const res = await fetch(`${API_URL}/genesis/${type}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchGenesisStatus(token: string) {
  const res = await fetch(`${API_URL}/genesis/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
