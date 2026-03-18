import { supabase } from "@/lib/supabase";

// ─── Overview Stats ───────────────────────────────────────────────────────────
/**
 * Fetch overview stats using optimized RPC function
 * Falls back to individual queries if RPC is not available
 */
export async function fetchOverviewStats() {
  // Try RPC first (much faster - single query)
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_overview_stats');

  if (!rpcError && rpcData && rpcData.length > 0) {
    const stats = rpcData[0];
    // Fetch recent syncs separately for display
    const { data: recentSyncs } = await supabase
      .from("sync_logs")
      .select("id, sync_type, status, started_at, completed_at, duration_ms, records_processed, records_failed, error_message")
      .order("started_at", { ascending: false })
      .limit(10);

    return {
      totalCompanies: Number(stats.total_companies) ?? 0,
      totalPriceRows: Number(stats.total_price_rows) ?? 0,
      totalUsers: Number(stats.total_users) ?? 0,
      totalWatchlists: Number(stats.total_watchlists) ?? 0,
      totalScreenerData: Number(stats.total_screener_data) ?? 0,
      totalSecurityEvents: Number(stats.total_security_events) ?? 0,
      totalTechnicals: Number(stats.total_technicals) ?? 0,
      totalNews: Number(stats.total_news) ?? 0,
      adminCount: Number(stats.admin_count) ?? 0,
      premiumCount: Number(stats.premium_count) ?? 0,
      maxCount: Number(stats.max_count) ?? 0,
      freeCount: Number(stats.free_count) ?? 0,
      newUsersThisWeek: Number(stats.new_users_this_week) ?? 0,
      recentSyncs: recentSyncs ?? [],
      lastSyncStatus: stats.last_sync_status ?? "unknown",
      failedSyncsRecent: Number(stats.failed_syncs_recent) ?? 0,
      systemHealthy: stats.system_healthy ?? false,
    };
  }

  // Fallback to individual queries (slower but backward compatible)
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
/**
 * Fetch sync logs with performance metrics
 * Uses optimized RPC function if available
 */
export async function fetchSyncLogs(limit = 50) {
  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_sync_logs', { p_limit: limit });

  if (!rpcError && rpcData) {
    return rpcData.map((row: any) => ({
      id: row.id,
      sync_type: row.sync_type,
      status: row.status,
      started_at: row.started_at,
      completed_at: row.completed_at,
      duration_ms: row.duration_seconds ? Math.round(row.duration_seconds * 1000) : null,
      records_processed: row.records_processed,
      records_failed: row.records_failed,
      error_message: row.error_message,
      success_rate: row.success_rate,
    }));
  }

  // Fallback to direct query
  const { data, error } = await supabase
    .from("sync_logs")
    .select("id, sync_type, status, started_at, completed_at, duration_ms, records_processed, records_failed, error_message, metadata")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch security events summary for analytics
 */
export async function fetchSecurityEventsSummary(days = 30) {
  const { data, error } = await supabase.rpc('admin_get_security_events_summary', { p_days: days });

  if (error) {
    // Fallback: fetch raw events and aggregate client-side
    const { data: events } = await supabase
      .from("security_events")
      .select("event_type, source, user_id, created_at")
      .gte("created_at", new Date(Date.now() - days * 86400000).toISOString())
      .order("created_at", { ascending: false });

    if (!events) return [];

    const summary = new Map<string, any>();
    events.forEach((event) => {
      if (!summary.has(event.event_type)) {
        summary.set(event.event_type, {
          event_type: event.event_type,
          event_count: 0,
          first_occurrence: event.created_at,
          last_occurrence: event.created_at,
          unique_users: new Set(),
          unique_sources: new Set(),
        });
      }
      const s = summary.get(event.event_type);
      s.event_count++;
      if (event.created_at < s.first_occurrence) s.first_occurrence = event.created_at;
      if (event.created_at > s.last_occurrence) s.last_occurrence = event.created_at;
      if (event.user_id) s.unique_users.add(event.user_id);
      if (event.source) s.unique_sources.add(event.source);
    });

    return Array.from(summary.values()).map((s) => ({
      ...s,
      unique_users: s.unique_users.size,
      unique_sources: s.unique_sources.size,
    }));
  }

  return data ?? [];
}

// ─── Users (with settings, screens, watchlist counts) ────────────────────────
/**
 * Fetch all users with aggregated details
 * Uses optimized RPC function if available, falls back to individual queries
 */
export async function fetchUsers() {
  // Fallback to individual queries since RPC may not exist or may have schema mismatch
  const [profiles, savedScreens, watchlistsRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, email, display_name, full_name, subscription_tier, role, created_at, updated_at, onboarded_at, billing_customer_id, newsletter_opt_in, announcements_opt_in, alerts_opt_in, events_and_promotions_opt_in, temp_suspend, perm_suspend, metadata, preferences")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_saved_screens")
      .select("user_id, id, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("watchlists")
      .select("user_id, id, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const screenCounts = new Map<string, number>();
  const screenLastActivity = new Map<string, string>();
  (savedScreens.data ?? []).forEach((s) => {
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
      settings: null,
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
    .select();

  if (error) {
    console.error("Error toggling temp suspension:", error);
    throw new Error(error.message || "Failed to update suspension status");
  }

  return data?.[0] || null;
}

export async function togglePermSuspend(userId: string, suspend: boolean) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ perm_suspend: suspend })
    .eq("id", userId)
    .select();

  if (error) {
    console.error("Error toggling perm suspension:", error);
    throw new Error(error.message || "Failed to update suspension status");
  }

  return data?.[0] || null;
}

export async function deleteUserAccount(userId: string) {
  // First, delete user data from user_profiles
  const { error: profileError } = await supabase
    .from("user_profiles")
    .delete()
    .eq("id", userId);

  if (profileError) {
    console.error("Error deleting user profile:", profileError);
    throw new Error(profileError.message || "Failed to delete user profile");
  }

  // Then delete from auth (if using Supabase auth admin)
  try {
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("Error deleting user from auth:", authError);
      // Don't throw here as profile is already deleted
    }
  } catch (err) {
    console.error("Auth deletion not available or failed:", err);
    // Continue anyway as profile deletion succeeded
  }
}

// ─── MFA Management ──────────────────────────────────────────────────────────

/**
 * Reset MFA for a user (disable all MFA factors)
 * Used when user has lost access to their authenticator app
 */
export async function resetUserMfa(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get all MFA factors for the user
    const { data: factors, error: listError } = await supabase.auth.admin.mfa.listFactors({
      userId,
    });

    if (listError) {
      console.error("Failed to list MFA factors:", listError);
      return { success: false, message: "Failed to list MFA factors" };
    }

    if (!factors?.factors || factors.factors.length === 0) {
      return { success: false, message: "User has no MFA factors enrolled" };
    }

    // Delete each MFA factor
    for (const factor of factors.factors) {
      const { error: deleteError } = await supabase.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId,
      });

      if (deleteError) {
        console.error("Failed to delete MFA factor:", deleteError);
      }
    }

    // Delete recovery codes
    const { error: rcError } = await supabase
      .from("mfa_recovery_codes")
      .delete()
      .eq("user_id", userId);

    if (rcError) {
      console.error("Failed to delete recovery codes:", rcError);
    }

    // Log the security event
    await supabase.from("security_events").insert({
      user_id: userId,
      event_type: "admin_mfa_reset",
      event_data: { action: "mfa_disabled_by_admin" },
    });

    return { success: true, message: "MFA has been disabled for the user" };
  } catch (err) {
    console.error("Error resetting MFA:", err);
    return { success: false, message: "Failed to reset MFA" };
  }
}

/**
 * Get MFA status for a user
 */
export async function getUserMfaStatus(userId: string): Promise<{ enabled: boolean; factorCount: number }> {
  try {
    const { data: factors, error } = await supabase.auth.admin.mfa.listFactors({
      userId,
    });

    if (error || !factors?.factors) {
      return { enabled: false, factorCount: 0 };
    }

    const verifiedFactors = factors.factors.filter((f) => f.status === "verified");
    return { enabled: verifiedFactors.length > 0, factorCount: verifiedFactors.length };
  } catch {
    return { enabled: false, factorCount: 0 };
  }
}

// ─── User Invitation ──────────────────────────────────────────────────────────

export interface InviteUserParams {
  email: string;
  full_name?: string;
  subscription_tier?: 'free' | 'premium' | 'max';
  role?: 'user' | 'admin';
  send_email?: boolean;
}

export interface InviteUserResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    invited_at: string;
  };
  error?: string;
  method?: 'supabase' | 'fallback';
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if user already exists by email
 */
export async function checkUserExists(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking user existence:", error);
    throw new Error("Failed to check if user exists");
  }

  return !!data;
}

/**
 * Invite a new user via server API
 * Uses server-side Supabase Admin API with service_role key
 */
export async function inviteUser(params: InviteUserParams): Promise<InviteUserResult> {
  const { email, full_name, subscription_tier = 'free', role = 'user' } = params;

  // Validate email format
  if (!isValidEmail(email)) {
    return {
      success: false,
      error: "Invalid email format"
    };
  }

  // Check if user already exists (client-side check for better UX)
  try {
    const exists = await checkUserExists(email);
    if (exists) {
      return {
        success: false,
        error: "User with this email already exists"
      };
    }
  } catch (err) {
    // Continue anyway - server will do the final check
    console.warn("Client-side user check failed, continuing:", err);
  }

  // Call server API to invite user
  try {
    const response = await fetch('/api/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        full_name,
        subscription_tier,
        role,
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to invite user"
      };
    }

    return result;
  } catch (err) {
    console.error("Invite error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}


/**
 * Resend invitation to a user
 */
export async function resendInvitation(userId: string): Promise<InviteUserResult> {
  try {
    const { data: userData, error: userError } = await supabase
      .from("user_profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        error: "User not found"
      };
    }

    // Resend via Supabase
    const { error } = await supabase.auth.admin.inviteUserByEmail(userData.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (error) {
      console.error("Resend invite error:", error);
      return {
        success: false,
        error: error.message || "Failed to resend invitation"
      };
    }

    return {
      success: true,
      method: 'supabase',
      user: {
        id: userId,
        email: userData.email,
        invited_at: new Date().toISOString()
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
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
// All functions now have graceful error handling for when Genesis is not available.

const GENESIS_URL =
  (process.env.NEXT_PUBLIC_GENESIS_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000").replace(/\/$/, ""); // Remove trailing slash

/**
 * Helper to fetch from Genesis API with graceful error handling
 */
async function fetchGenesis<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const res = await fetch(`${GENESIS_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    // Handle 404 gracefully - Genesis API might not be deployed
    if (res.status === 404) {
      console.warn(`Genesis API endpoint ${endpoint} not available (404). This feature requires the Genesis service.`);
      return null;
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Genesis API error (${endpoint}):`, message);
    throw error;
  }
}

export async function triggerGenesisPipeline(
  type: "daily" | "weekly" | "full" | "indices",
  token: string
) {
  return fetchGenesis(`/genesis/${type}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Pipeline-Secret": process.env.NEXT_PUBLIC_PIPELINE_SECRET || "dev-pipeline-secret",
      "Content-Type": "application/json",
    },
  });
}

export async function fetchGenesisStatus(token: string) {
  return fetchGenesis(`/genesis/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Pipeline-Secret": process.env.NEXT_PUBLIC_PIPELINE_SECRET || "dev-pipeline-secret"
    }
  });
}

export async function fetchGenesisBudget(token: string) {
  return fetchGenesis(`/genesis/budget`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Pipeline-Secret": process.env.NEXT_PUBLIC_PIPELINE_SECRET || "dev-pipeline-secret"
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Genesis Admin API calls
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchGenesisDashboard(token: string) {
  return fetchGenesis(`/admin/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function fetchCreditAnalytics(token: string) {
  return fetchGenesis(`/admin/credits`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function recomputeAllTechnicals(token: string) {
  return fetchGenesis(`/admin/tickers/recompute-all-technicals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function recomputeTickerTechnicals(token: string, symbol: string) {
  return fetchGenesis(`/admin/tickers/${symbol}/recompute-technicals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function fetchGenesisQueueState(token: string) {
  return fetchGenesis(`/admin/queue`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function fetchGenesisFailedQueue(token: string) {
  return fetchGenesis(`/admin/queue/failed`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function retryGenesisFailedJob(id: number, token: string) {
  return fetchGenesis(`/admin/queue/${id}/retry`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function retryAllGenesisFailedJobs(token: string) {
  return fetchGenesis(`/admin/queue/retry-all-failed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function clearGenesisFailedJobs(token: string) {
  return fetchGenesis(`/admin/queue/clear-failed`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function fetchGenesisLogs(token: string, limit = 50) {
  const result = await fetchGenesis(`/admin/logs?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret",
    },
  });
  if (!result) return [];
  const json = result as any;
  return (json.logs ?? []).map((l: any) => ({
    id: String(l.id),
    sync_type: l.sync_type,
    status: l.status,
    started_at: l.started_at,
    completed_at: l.completed_at ?? null,
    duration_ms: l.duration_ms ?? null,
    records_processed: l.records_processed ?? null,
    records_failed: l.records_failed ?? 0,
    error_message: l.error_message ?? null,
    metadata: l.metadata ?? null,
  }));
}

export async function fetchGenesisAlertsConfig(token: string) {
  return fetchGenesis(`/admin/alerts/config`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function setGenesisAlertsConfig(webhookUrl: string, token: string) {
  return fetchGenesis(`/admin/alerts/config`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ webhook_url: webhookUrl }),
  });
}

export async function testGenesisAlerts(token: string) {
  return fetchGenesis(`/admin/alerts/test`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

// ─── Redis Logs ────────────────────────────────────────────────────────────────

export interface RedisLogEntry {
  id?: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  operation: string;
  key?: string;
  duration_ms?: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

export interface RedisStatus {
  connected: boolean;
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
    keyCount: number;
  } | null;
  logStats: {
    total: number;
    byLevel: Record<string, number>;
    byOperation: Record<string, number>;
    errorRate: number;
  } | null;
}

export async function fetchRedisStatus(token: string): Promise<RedisStatus | null> {
  return fetchGenesis(`/admin/redis/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function fetchRedisLogs(
  token: string,
  options: {
    limit?: number;
    offset?: number;
    level?: string;
    operation?: string;
  } = {}
): Promise<{ logs: RedisLogEntry[]; total: number } | null> {
  const params = new URLSearchParams();
  if (options.limit) params.append("limit", String(options.limit));
  if (options.offset) params.append("offset", String(options.offset));
  if (options.level) params.append("level", options.level);
  if (options.operation) params.append("operation", options.operation);

  return fetchGenesis(`/admin/redis/logs?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function fetchRedisRecentLogs(token: string, limit = 100): Promise<RedisLogEntry[]> {
  const result = await fetchGenesis<RedisLogEntry[]>(`/admin/redis/logs/recent?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
  return result ?? [];
}

export async function fetchRedisLogStats(token: string, hours = 24) {
  return fetchGenesis(`/admin/redis/logs/stats?hours=${hours}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function clearRedisCache(token: string, prefix: string): Promise<{ cleared: number } | null> {
  return fetchGenesis(`/admin/redis/cache/clear?prefix=${encodeURIComponent(prefix)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function pingRedis(token: string): Promise<{ pong: boolean; latencyMs: number } | null> {
  return fetchGenesis(`/admin/redis/ping`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function fetchGenesisTickers(
  token: string,
  page = 1,
  limit = 100,
  status = "",
  sector = "",
  search = "",
  exchange = ""
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.append("status", status);
  if (sector) params.append("sector", sector);
  if (search) params.append("search", search);
  if (exchange) params.append("exchange", exchange);

  const result = await fetchGenesis(`/admin/tickers?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });

  // Return empty state if Genesis API is not available
  if (!result) {
    return {
      tickers: [],
      summary: { total: 0, healthy: 0, stale: 0, errors: 0, review: 0 },
      total_pages: 1,
      total: 0,
      genesisUnavailable: true,
    };
  }

  return result;
}

export async function refreshGenesisTicker(symbol: string, token: string) {
  return fetchGenesis(`/admin/tickers/${symbol}/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret"
    }
  });
}

export async function setGenesisTickerStatus(symbol: string, status: string, token: string) {
  return fetchGenesis(`/admin/tickers/${symbol}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
}

export async function addGenesisTicker(symbol: string, exchange: string, token: string) {
  return fetchGenesis(`/admin/tickers/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ symbol, exchange }),
  });
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

// ─── Data Quality (Genesis-backed) ────────────────────────────────────────────

export async function fetchDataQuality(token: string) {
  return fetchGenesis(`/admin/data-quality`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret",
    },
  });
}

export async function runDataQualityValidation(token: string) {
  return fetchGenesis(`/admin/data-quality/validate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-admin-secret",
    },
  });
}

