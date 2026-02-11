"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  CheckCircle2,
  Timer,
  Database,
  ShieldAlert,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { fetchAnalyticsData } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const TIER_COLORS: Record<string, string> = {
  free: "#6366f1",
  premium: "#f59e0b",
  pro: "#10b981",
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--foreground))",
};

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

interface AnalyticsState {
  totalUsers: number;
  newUsersThisWeek: number;
  adminCount: number;
  onboardingRate: number;
  tierDistribution: { tier: string; count: number }[];
  signupTimeline: { date: string; count: number }[];
  securityTimeline: { date: string; count: number }[];
  eventTypeCounts: Record<string, number>;
  syncSuccessRate: number;
  syncFailCount: number;
  avgSyncDuration: number;
  maxSyncDuration: number;
  minSyncDuration: number;
  totalRecordsSynced: number;
  totalRecordsFailed: number;
  totalSyncs: number;
  syncByType: Record<string, { total: number; success: number; failed: number; avgMs: number }>;
  apiLatencyMs: number;
  dbStats: {
    companies: number;
    priceRecords: number;
    newsArticles: number;
    screenerRows: number;
    watchlists: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchAnalyticsData();
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cumulativeSignups = useMemo(() => {
    if (!data) return [];
    let total = 0;
    return data.signupTimeline.map((d) => {
      total += d.count;
      return { date: d.date, total };
    });
  }, [data]);

  const securityBreakdown = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.eventTypeCounts)
      .map(([type, count]) => ({ type: type.replace(/_/g, " "), count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const S = ({ className }: { className?: string }) => (
    <Skeleton className={className ?? "h-8 w-20"} />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Real-time platform metrics from Supabase
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className="text-2xl font-bold">{data?.totalUsers ?? 0}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data?.adminCount ?? 0} admin{(data?.adminCount ?? 0) !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New This Week</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className="text-2xl font-bold">{data?.newUsersThisWeek ?? 0}</div>
                {(data?.newUsersThisWeek ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-emerald-500">+{data?.newUsersThisWeek} this week</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sync Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className={`text-2xl font-bold ${(data?.syncSuccessRate ?? 100) < 90 ? "text-destructive" : "text-emerald-500"}`}>
                  {data?.syncSuccessRate ?? 100}%
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data?.totalSyncs ?? 0} syncs &middot; {data?.syncFailCount ?? 0} failed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Sync Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className="text-2xl font-bold">{data?.avgSyncDuration ?? 0}s</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(data?.totalRecordsSynced ?? 0).toLocaleString()} records synced (30d)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Signup Chart + Tier Distribution ──────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Signups</CardTitle>
            <CardDescription>Daily registrations (last 90 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (data?.signupTimeline.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No signup data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.signupTimeline}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Tiers</CardTitle>
            <CardDescription>Current user distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="mx-auto h-[200px] w-[200px] rounded-full" />
            ) : (data?.tierDistribution.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data?.tierDistribution}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {data?.tierDistribution.map((entry) => (
                        <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3">
                  {data?.tierDistribution.map((t) => (
                    <Badge
                      key={t.tier}
                      variant="outline"
                      className="gap-1.5 capitalize"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: TIER_COLORS[t.tier] ?? "#94a3b8" }}
                      />
                      {t.tier}: {t.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Cumulative Growth + Security Timeline ─────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Growth</CardTitle>
            <CardDescription>Running total of user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : cumulativeSignups.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={cumulativeSignups}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Events</CardTitle>
            <CardDescription>Daily event volume (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (data?.securityTimeline.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No security events.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.securityTimeline}>
                  <defs>
                    <linearGradient id="secGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="url(#secGrad)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Pipeline + Security Breakdown ────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" /> Pipeline Health
            </CardTitle>
            <CardDescription>Last 30 days ingestion stats</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Syncs</span>
                  <span className="text-sm font-semibold">{data?.totalSyncs ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <Badge className={`border-0 ${(data?.syncSuccessRate ?? 100) >= 90 ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400" : "bg-red-600/20 text-red-700 dark:text-red-400"}`}>
                    {data?.syncSuccessRate ?? 100}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Failed Syncs</span>
                  <span className={`text-sm font-semibold ${(data?.syncFailCount ?? 0) > 0 ? "text-destructive" : ""}`}>
                    {data?.syncFailCount ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Duration</span>
                  <span className="text-sm font-semibold">{data?.avgSyncDuration ?? 0}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Records Synced</span>
                  <span className="text-sm font-semibold">{(data?.totalRecordsSynced ?? 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Security Breakdown
            </CardTitle>
            <CardDescription>Event types in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : securityBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No events recorded.</p>
            ) : (
              <div className="space-y-3">
                {securityBreakdown.map((item) => {
                  const max = securityBreakdown[0]?.count ?? 1;
                  const pct = Math.round((item.count / max) * 100);
                  return (
                    <div key={item.type}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{item.type}</span>
                        <span className="font-semibold tabular-nums">{item.count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 5: Performance, Sync Type Breakdown, DB Inventory ─────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Performance & Latency</CardTitle>
            <CardDescription>API response times & sync durations</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Supabase API Latency</span>
                  <Badge className={`border-0 tabular-nums ${(data?.apiLatencyMs ?? 0) < 2000 ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400" : "bg-amber-600/20 text-amber-700 dark:text-amber-400"}`}>
                    {data?.apiLatencyMs ?? 0}ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Sync Duration</span>
                  <span className="text-sm font-semibold tabular-nums">{data?.avgSyncDuration ?? 0}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Min Sync Duration</span>
                  <span className="text-sm font-semibold tabular-nums">{data?.minSyncDuration ?? 0}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Sync Duration</span>
                  <span className="text-sm font-semibold tabular-nums">{data?.maxSyncDuration ?? 0}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Records Failed (30d)</span>
                  <span className={`text-sm font-semibold tabular-nums ${(data?.totalRecordsFailed ?? 0) > 0 ? "text-destructive" : ""}`}>
                    {(data?.totalRecordsFailed ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Onboarding Rate</span>
                  <span className="text-sm font-semibold tabular-nums">{data?.onboardingRate ?? 0}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Type Breakdown</CardTitle>
            <CardDescription>Performance by sync type (30d)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : !data?.syncByType || Object.keys(data.syncByType).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No sync data.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(data.syncByType).map(([type, stats]) => (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{type}</span>
                      <span className="text-xs text-muted-foreground">{stats.total} runs</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-emerald-500">{stats.success} ok</span>
                      <span>&middot;</span>
                      <span className={stats.failed > 0 ? "text-destructive" : ""}>{stats.failed} fail</span>
                      <span>&middot;</span>
                      <span>~{stats.avgMs}s avg</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500/60 transition-all"
                        style={{ width: `${stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Inventory</CardTitle>
            <CardDescription>Current data volume across tables</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Companies", value: data?.dbStats.companies ?? 0 },
                  { label: "Price Records", value: data?.dbStats.priceRecords ?? 0 },
                  { label: "News Articles", value: data?.dbStats.newsArticles ?? 0 },
                  { label: "Screener Rows", value: data?.dbStats.screenerRows ?? 0 },
                  { label: "Watchlists", value: data?.dbStats.watchlists ?? 0 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold tabular-nums">{row.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
