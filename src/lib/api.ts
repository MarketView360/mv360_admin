import { supabase } from "@/lib/supabase";

// ─── Overview Stats ───────────────────────────────────────────────────────────

export async function fetchOverviewStats() {
  const [
    companies,
    priceRows,
    users,
    syncLogs,
    watchlists,
    screenerData,
    secEvents,
    technicals,
    news,
  ] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("price_data").select("id", { count: "exact", head: true }),
    supabase.from("user_profiles").select("id, subscription_tier, role, created_at"),
    supabase
      .from("sync_logs")
      .select("id, sync_type, status, started_at, completed_at, duration_ms, records_processed, records_failed, error_message")
      .order("started_at", { ascending: false })
      .limit(10),
    supabase.from("watchlists").select("id", { count: "exact", head: true }),
    supabase.from("screener_data").select("id", { count: "exact", head: true }),
    supabase.from("security_events").select("id", { count: "exact", head: true }),
    supabase.from("technical_indicators").select("id", { count: "exact", head: true }),
    supabase.from("news").select("id", { count: "exact", head: true }),
  ]);

  const allUsers = users.data ?? [];
  const recentSyncs = syncLogs.data ?? [];
  const lastSync = recentSyncs[0] ?? null;
  const failedSyncs = recentSyncs.filter((s) => s.status === "failed").length;

  return {
    totalCompanies: companies.count ?? 0,
    totalPriceRows: priceRows.count ?? 0,
    totalUsers: allUsers.length,
    totalWatchlists: watchlists.count ?? 0,
    totalScreenerData: screenerData.count ?? 0,
    totalSecurityEvents: secEvents.count ?? 0,
    totalTechnicals: technicals.count ?? 0,
    totalNews: news.count ?? 0,
    adminCount: allUsers.filter((u) => u.role === "admin").length,
    premiumCount: allUsers.filter((u) => u.subscription_tier === "premium").length,
    maxCount: allUsers.filter((u) => u.subscription_tier === "max").length,
    freeCount: allUsers.filter((u) => !u.subscription_tier || u.subscription_tier === "free").length,
    newUsersThisWeek: allUsers.filter(
      (u) => u.created_at && new Date(u.created_at).getTime() > Date.now() - 7 * 86400000
    ).length,
    recentSyncs,
    lastSyncStatus: lastSync?.status ?? "unknown",
    failedSyncsRecent: failedSyncs,
    systemHealthy: failedSyncs === 0 && (lastSync?.status === "completed" || lastSync === null),
  };
}

// ─── Genesis Engine / Sync Logs ──────────────────────────────────────────────

export async function fetchSyncLogs(limit = 50) {
  const { data, error } = await supabase
    .from("sync_logs")
    .select("id, sync_type, status, started_at, completed_at, duration_ms, records_processed, records_failed, error_message, metadata")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Users (with settings, screens, watchlist counts) ────────────────────────

export async function fetchUsers() {
  const [profiles, settings, screens, watchlistsRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, email, display_name, full_name, subscription_tier, role, created_at, updated_at, onboarded_at, billing_customer_id, newsletter_opt_in, announcements_opt_in, alerts_opt_in, events_and_promotions_opt_in, temp_suspend, perm_suspend, metadata, preferences")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_settings")
      .select("user_id, theme, text_size, compact_mode, reduce_animations, desktop_notifications, email_notifications, use_custom_ai_keys"),
    supabase
      .from("user_screens")
      .select("user_id, id, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("watchlists")
      .select("user_id, id, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const settingsMap = new Map<string, (typeof settings.data extends (infer T)[] | null ? T : never)>();
  (settings.data ?? []).forEach((s) => settingsMap.set(s.user_id, s));

  const screenCounts = new Map<string, number>();
  const screenLastActivity = new Map<string, string>();
  (screens.data ?? []).forEach((s) => {
    screenCounts.set(s.user_id, (screenCounts.get(s.user_id) ?? 0) + 1);
    if (!screenLastActivity.has(s.user_id) || (s.updated_at && s.updated_at > screenLastActivity.get(s.user_id)!)) {
      screenLastActivity.set(s.user_id, s.updated_at || "");
    }
  });

  const watchlistCounts = new Map<string, number>();
  const watchlistLastActivity = new Map<string, string>();
  (watchlistsRes.data ?? []).forEach((w) => {
    watchlistCounts.set(w.user_id, (watchlistCounts.get(w.user_id) ?? 0) + 1);
    if (!watchlistLastActivity.has(w.user_id) || (w.updated_at && w.updated_at > watchlistLastActivity.get(w.user_id)!)) {
      watchlistLastActivity.set(w.user_id, w.updated_at || "");
    }
  });

  return (profiles.data ?? []).map((p) => {
    const screenActivity = screenLastActivity.get(p.id);
    const watchlistActivity = watchlistLastActivity.get(p.id);
    let lastActivity = p.updated_at;
    
    if (screenActivity && (!lastActivity || screenActivity > lastActivity)) lastActivity = screenActivity;
    if (watchlistActivity && (!lastActivity || watchlistActivity > lastActivity)) lastActivity = watchlistActivity;

    return {
      ...p,
      settings: settingsMap.get(p.id) ?? null,
      screenCount: screenCounts.get(p.id) ?? 0,
      watchlistCount: watchlistCounts.get(p.id) ?? 0,
      lastActivity,
    };
  });
}

export async function updateUserProfile(userId: string, updates: {
  subscription_tier?: string;
  role?: string;
  full_name?: string;
  newsletter_opt_in?: boolean;
  announcements_opt_in?: boolean;
  alerts_opt_in?: boolean;
  events_and_promotions_opt_in?: boolean;
  temp_suspend?: boolean;
  perm_suspend?: boolean;
}) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleTempSuspend(userId: string, suspend: boolean) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ temp_suspend: suspend })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function togglePermSuspend(userId: string, suspend: boolean) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ perm_suspend: suspend })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUserAccount(userId: string) {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
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

// ─── Analytics (real data + performance) ─────────────────────────────────────

export async function fetchAnalyticsData() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();

  // Measure Supabase API latency
  const latencyStart = performance.now();

  const [
    allUsers,
    recentSignups,
    weekSignups,
    recentSecurityEvents,
    syncActivity,
    watchlistCount,
    newsCount,
    priceCount,
    companiesCount,
    screenerCount,
  ] = await Promise.all([
    supabase.from("user_profiles").select("id, subscription_tier, role, created_at, onboarded_at"),
    supabase.from("user_profiles").select("created_at").gte("created_at", ninetyDaysAgo).order("created_at", { ascending: true }),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("security_events").select("event_type, source, created_at").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: true }),
    supabase.from("sync_logs").select("sync_type, status, started_at, records_processed, records_failed, duration_ms").gte("started_at", thirtyDaysAgo).order("started_at", { ascending: true }),
    supabase.from("watchlists").select("id", { count: "exact", head: true }),
    supabase.from("news").select("id", { count: "exact", head: true }),
    supabase.from("price_data").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("screener_data").select("id", { count: "exact", head: true }),
  ]);

  const apiLatencyMs = Math.round(performance.now() - latencyStart);

  const users = allUsers.data ?? [];
  const signups90d = recentSignups.data ?? [];
  const secEvents = recentSecurityEvents.data ?? [];
  const syncs = syncActivity.data ?? [];

  // Tier distribution
  const tierCounts: Record<string, number> = {};
  users.forEach((u) => { tierCounts[u.subscription_tier || "free"] = (tierCounts[u.subscription_tier || "free"] || 0) + 1; });
  const tierDistribution = Object.entries(tierCounts).map(([tier, count]) => ({ tier, count }));

  // Onboarding rate
  const onboardedCount = users.filter((u) => u.onboarded_at).length;
  const onboardingRate = users.length > 0 ? Math.round((onboardedCount / users.length) * 100) : 0;

  // Signups by day
  const signupsByDay: Record<string, number> = {};
  signups90d.forEach((u) => { const d = u.created_at?.split("T")[0] ?? ""; if (d) signupsByDay[d] = (signupsByDay[d] || 0) + 1; });
  const signupTimeline = Object.entries(signupsByDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

  // Security events by type + day
  const eventTypeCounts: Record<string, number> = {};
  const secEventsByDay: Record<string, number> = {};
  secEvents.forEach((e) => {
    eventTypeCounts[e.event_type || "unknown"] = (eventTypeCounts[e.event_type || "unknown"] || 0) + 1;
    const d = e.created_at?.split("T")[0] ?? "";
    if (d) secEventsByDay[d] = (secEventsByDay[d] || 0) + 1;
  });
  const securityTimeline = Object.entries(secEventsByDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

  // Sync stats
  const syncSuccessCount = syncs.filter((s) => s.status === "completed").length;
  const syncFailCount = syncs.filter((s) => s.status === "failed").length;
  const totalSyncs = syncs.length;
  const syncSuccessRate = totalSyncs > 0 ? Math.round((syncSuccessCount / totalSyncs) * 100) : 100;

  const durationsMs = syncs.filter((s) => s.duration_ms && s.duration_ms > 0).map((s) => s.duration_ms as number);
  const avgSyncDuration = durationsMs.length > 0 ? Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 1000) : 0;
  const maxSyncDuration = durationsMs.length > 0 ? Math.round(Math.max(...durationsMs) / 1000) : 0;
  const minSyncDuration = durationsMs.length > 0 ? Math.round(Math.min(...durationsMs) / 1000) : 0;

  const totalRecordsSynced = syncs.reduce((sum, s) => sum + (s.records_processed || 0), 0);
  const totalRecordsFailed = syncs.reduce((sum, s) => sum + (s.records_failed || 0), 0);

  // Sync by type breakdown
  const syncByType: Record<string, { total: number; success: number; failed: number; avgMs: number }> = {};
  syncs.forEach((s) => {
    if (!syncByType[s.sync_type]) syncByType[s.sync_type] = { total: 0, success: 0, failed: 0, avgMs: 0 };
    syncByType[s.sync_type].total++;
    if (s.status === "completed") syncByType[s.sync_type].success++;
    if (s.status === "failed") syncByType[s.sync_type].failed++;
    if (s.duration_ms) syncByType[s.sync_type].avgMs += s.duration_ms;
  });
  Object.values(syncByType).forEach((v) => { if (v.total > 0) v.avgMs = Math.round(v.avgMs / v.total / 1000); });

  return {
    totalUsers: users.length,
    newUsersThisWeek: weekSignups.count ?? 0,
    adminCount: users.filter((u) => u.role === "admin").length,
    onboardingRate,
    tierDistribution,
    signupTimeline,
    securityTimeline,
    eventTypeCounts,
    syncSuccessRate,
    syncFailCount,
    avgSyncDuration,
    maxSyncDuration,
    minSyncDuration,
    totalRecordsSynced,
    totalRecordsFailed,
    totalSyncs,
    syncByType,
    // Performance / platform stats
    apiLatencyMs,
    dbStats: {
      companies: companiesCount.count ?? 0,
      priceRecords: priceCount.count ?? 0,
      newsArticles: newsCount.count ?? 0,
      screenerRows: screenerCount.count ?? 0,
      watchlists: watchlistCount.count ?? 0,
    },
  };
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

// ─── Revenue (real subscription data) ────────────────────────────────────────

export async function fetchRevenueData() {
  const [profiles, weekAgo, monthAgo] = await Promise.all([
    supabase.from("user_profiles").select("id, subscription_tier, billing_customer_id, created_at"),
    supabase.from("user_profiles").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from("user_profiles").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);

  const users = profiles.data ?? [];
  const free = users.filter((u) => !u.subscription_tier || u.subscription_tier === "free").length;
  const premium = users.filter((u) => u.subscription_tier === "premium").length;
  const max = users.filter((u) => u.subscription_tier === "max").length;
  const withBilling = users.filter((u) => u.billing_customer_id).length;

  // Tier pricing estimates (monthly)
  const TIER_PRICES: Record<string, number> = { free: 0, premium: 19.99, max: 49.99 };
  const estimatedMRR = premium * TIER_PRICES.premium + max * TIER_PRICES.max;

  // Signups by month for last 6 months
  const monthlySignups: Record<string, { free: number; premium: number; max: number }> = {};
  users.forEach((u) => {
    const m = u.created_at?.slice(0, 7) ?? "";
    if (!m) return;
    if (!monthlySignups[m]) monthlySignups[m] = { free: 0, premium: 0, max: 0 };
    const tier = u.subscription_tier || "free";
    if (tier in monthlySignups[m]) monthlySignups[m][tier as keyof typeof monthlySignups[typeof m]]++;
  });
  const revenueTimeline = Object.entries(monthlySignups)
    .map(([month, counts]) => ({
      month,
      free: counts.free,
      premium: counts.premium,
      max: counts.max,
      estimatedRevenue: counts.premium * TIER_PRICES.premium + counts.max * TIER_PRICES.max,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  return {
    totalUsers: users.length,
    free,
    premium,
    max,
    withBilling,
    estimatedMRR,
    newThisWeek: weekAgo.count ?? 0,
    newThisMonth: monthAgo.count ?? 0,
    conversionRate: users.length > 0 ? Math.round(((premium + max) / users.length) * 100) : 0,
    revenueTimeline,
  };
}

// ─── Genesis API calls ────────────────────────────────────────────────────────
// Points directly at the Go Genesis service (standalone REST API).
// Falls back to the NestJS backend URL for backward compatibility.

const GENESIS_URL =
  process.env.NEXT_PUBLIC_GENESIS_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function triggerGenesisPipeline(
  type: "daily" | "weekly" | "full",
  token: string
) {
  const res = await fetch(`${GENESIS_URL}/genesis/${type}`, {
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
  const res = await fetch(`${GENESIS_URL}/genesis/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchGenesisBudget(token: string) {
  const res = await fetch(`${GENESIS_URL}/genesis/budget`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface BlogPost {
  id: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  title: string;
  description: string;
  date: string;
  type: string;
  content: string | null;
  read_time: number;
  is_featured: boolean;
  published: boolean;
  status: string;
}

export interface Announcement {
  id: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  text: string | null;
  isActive: boolean | null;
  isClickable: boolean | null;
  Description: string | null;
  status: string;
}

export interface MaintenanceWindow {
  id: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  scheduled_at: string | null;
  ends_at: string | null;
  is_Active: boolean | null;
  title: string | null;
  description: string | null;
  status: string;
}

export async function fetchBlogPosts(includeTrash = false) {
  let query = supabase.schema("admin").from("blog").select("*");
  
  if (!includeTrash) {
    query = query.neq("status", "trash");
  }
  
  const { data, error } = await query.order("date", { ascending: false });
  if (error) throw error;
  return data as BlogPost[];
}

export async function createBlogPost(post: Omit<BlogPost, "id" | "created_at" | "updated_at" | "deleted_at">) {
  const { data, error } = await supabase.schema("admin").from("blog").insert(post).select().single();
  if (error) throw error;
  return data as BlogPost;
}

export async function updateBlogPost(id: number, updates: Partial<Omit<BlogPost, "id" | "created_at">>) {
  const updateData = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.schema("admin").from("blog").update(updateData).eq("id", id).select().single();
  if (error) throw error;
  return data as BlogPost;
}

export async function moveBlogPostToTrash(id: number) {
  const { data, error } = await supabase
    .schema("admin")
    .from("blog")
    .update({ status: "trash", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as BlogPost;
}

export async function restoreBlogPost(id: number) {
  const { data, error } = await supabase
    .schema("admin")
    .from("blog")
    .update({ status: "draft", deleted_at: null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as BlogPost;
}

export async function deleteBlogPostPermanently(id: number) {
  const { error } = await supabase.schema("admin").from("blog").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAnnouncements(includeTrash = false) {
  let query = supabase.schema("admin").from("announcements").select("*");
  
  if (!includeTrash) {
    query = query.neq("status", "trash");
  }
  
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data as Announcement[];
}

export async function createAnnouncement(announcement: Omit<Announcement, "id" | "created_at" | "updated_at" | "deleted_at">) {
  const { data, error } = await supabase.schema("admin").from("announcements").insert(announcement).select().single();
  if (error) throw error;
  return data as Announcement;
}

export async function updateAnnouncement(id: number, updates: Partial<Omit<Announcement, "id" | "created_at">>) {
  const updateData = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.schema("admin").from("announcements").update(updateData).eq("id", id).select().single();
  if (error) throw error;
  return data as Announcement;
}

export async function moveAnnouncementToTrash(id: number) {
  const { data, error } = await supabase
    .schema("admin")
    .from("announcements")
    .update({ status: "trash", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Announcement;
}

export async function restoreAnnouncement(id: number) {
  const { data, error } = await supabase
    .schema("admin")
    .from("announcements")
    .update({ status: "draft", deleted_at: null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Announcement;
}

export async function deleteAnnouncementPermanently(id: number) {
  const { error } = await supabase.schema("admin").from("announcements").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchMaintenanceWindows(includeTrash = false) {
  let query = supabase.schema("admin").from("maintenance").select("*");
  
  if (!includeTrash) {
    query = query.neq("status", "trash");
  }
  
  const { data, error } = await query.order("scheduled_at", { ascending: false });
  if (error) throw error;
  return data as MaintenanceWindow[];
}

export async function createMaintenanceWindow(window: Omit<MaintenanceWindow, "id" | "created_at" | "updated_at" | "deleted_at">) {
  const { data, error } = await supabase.schema("admin").from("maintenance").insert(window).select().single();
  if (error) throw error;
  return data as MaintenanceWindow;
}

export async function updateMaintenanceWindow(id: number, updates: Partial<Omit<MaintenanceWindow, "id" | "created_at">>) {
  const updateData = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.schema("admin").from("maintenance").update(updateData).eq("id", id).select().single();
  if (error) throw error;
  return data as MaintenanceWindow;
}

export async function moveMaintenanceWindowToTrash(id: number) {
  const { data, error } = await supabase
    .schema("admin")
    .from("maintenance")
    .update({ status: "trash", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MaintenanceWindow;
}

export async function restoreMaintenanceWindow(id: number) {
  const { data, error } = await supabase
    .schema("admin")
    .from("maintenance")
    .update({ status: "draft", deleted_at: null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MaintenanceWindow;
}

export async function deleteMaintenanceWindowPermanently(id: number) {
  const { error } = await supabase.schema("admin").from("maintenance").delete().eq("id", id);
  if (error) throw error;
}

export interface LastSyncInfo {
  lastSyncTime: string | null;
  syncsByTable: {
    tableName: string;
    lastSync: string | null;
    status: string | null;
    recordsProcessed: number | null;
  }[];
}

export interface DashboardTickerStats {
  totalCompanies: number;
  totalUsers: number;
  priceRecords: number;
  newsArticles: number;
  activeWatchlists: number;
  lastSyncTime: string | null;
}

export async function fetchLastSyncInfo(): Promise<LastSyncInfo> {
  const { data: syncs, error } = await supabase
    .from("sync_logs")
    .select("sync_type, completed_at, status, records_processed")
    .order("completed_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  const syncsByTable: Record<string, { lastSync: string | null; status: string | null; recordsProcessed: number | null }> = {};
  
  (syncs || []).forEach((sync) => {
    if (!syncsByTable[sync.sync_type]) {
      syncsByTable[sync.sync_type] = {
        lastSync: sync.completed_at,
        status: sync.status,
        recordsProcessed: sync.records_processed,
      };
    }
  });

  const mostRecentSync = syncs?.[0]?.completed_at || null;

  return {
    lastSyncTime: mostRecentSync,
    syncsByTable: Object.entries(syncsByTable).map(([tableName, info]) => ({
      tableName,
      ...info,
    })),
  };
}

export async function fetchDashboardTickerStats(): Promise<DashboardTickerStats> {
  const [companies, users, priceRows, news, watchlists, syncInfo] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("price_data").select("id", { count: "exact", head: true }),
    supabase.from("news").select("id", { count: "exact", head: true }),
    supabase.from("watchlists").select("id", { count: "exact", head: true }),
    fetchLastSyncInfo(),
  ]);

  return {
    totalCompanies: companies.count ?? 0,
    totalUsers: users.count ?? 0,
    priceRecords: priceRows.count ?? 0,
    newsArticles: news.count ?? 0,
    activeWatchlists: watchlists.count ?? 0,
    lastSyncTime: syncInfo.lastSyncTime,
  };
}
