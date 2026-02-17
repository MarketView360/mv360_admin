"use client";

import { useEffect, useState } from "react";
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
  Building2,
  BarChart3,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Newspaper,
  Eye,
  Shield,
  TrendingUp,
  Database,
  RefreshCw,
} from "lucide-react";
import { fetchOverviewStats } from "@/lib/api";

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  records_processed: number | null;
  records_failed: number | null;
  error_message: string | null;
}

interface OverviewStats {
  totalCompanies: number;
  totalPriceRows: number;
  totalUsers: number;
  totalWatchlists: number;
  totalScreenerData: number;
  totalSecurityEvents: number;
  totalTechnicals: number;
  totalNews: number;
  adminCount: number;
  premiumCount: number;
  eliteCount: number;
  freeCount: number;
  newUsersThisWeek: number;
  recentSyncs: SyncLog[];
  lastSyncStatus: string;
  failedSyncsRecent: number;
  systemHealthy: boolean;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed" || status === "success") {
    return (
      <Badge className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-0">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  }
  if (status === "failed" || status === "error") {
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <Clock className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchOverviewStats();
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const S = () => <Skeleton className="h-8 w-20" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">MarketView360 system overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Row 1: Core KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className="text-2xl font-bold">{stats?.totalCompanies.toLocaleString()}</div>
                <p className="mt-1 text-xs text-muted-foreground">{stats?.totalScreenerData.toLocaleString()} screener rows</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Price Records</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className="text-2xl font-bold">{(stats?.totalPriceRows ?? 0) > 1000000 ? `${((stats?.totalPriceRows ?? 0) / 1000000).toFixed(1)}M` : stats?.totalPriceRows.toLocaleString()}</div>
                <p className="mt-1 text-xs text-muted-foreground">{stats?.totalTechnicals.toLocaleString()} technical indicators</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className="text-2xl font-bold">{stats?.totalUsers}</div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {stats?.freeCount} free
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400">
                    {stats?.premiumCount} premium
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/40 text-purple-600 dark:text-purple-400">
                    {stats?.eliteCount} elite
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className={`text-2xl font-bold ${stats?.systemHealthy ? "text-emerald-500" : "text-destructive"}`}>
                  {stats?.systemHealthy ? "Healthy" : "Issues"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats?.failedSyncsRecent ?? 0} failed in last 10 runs
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Secondary stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className="text-2xl font-bold">{stats?.newUsersThisWeek ?? 0}</div>
                <p className="mt-1 text-xs text-muted-foreground">user signups (7d)</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Watchlists</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <div className="text-2xl font-bold">{stats?.totalWatchlists ?? 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">News Articles</CardTitle>
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <div className="text-2xl font-bold">{(stats?.totalNews ?? 0).toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <div className="text-2xl font-bold">{stats?.totalSecurityEvents ?? 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Pipeline + Data coverage */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Pipeline Runs</CardTitle>
            <CardDescription>Last 10 Genesis Engine sync jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (stats?.recentSyncs.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No sync logs found.</p>
            ) : (
              <div className="space-y-2">
                {stats?.recentSyncs.map((sync) => (
                  <div
                    key={sync.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={sync.status} />
                      <div>
                        <p className="text-sm font-medium capitalize">{sync.sync_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sync.started_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {sync.records_processed?.toLocaleString() ?? "—"} records
                      </p>
                      {sync.duration_ms ? (
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {sync.duration_ms > 60000
                            ? `${(sync.duration_ms / 60000).toFixed(1)}m`
                            : `${(sync.duration_ms / 1000).toFixed(1)}s`}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" /> Data Coverage
            </CardTitle>
            <CardDescription>Platform data inventory</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {[
                  { label: "Companies", value: stats?.totalCompanies ?? 0 },
                  { label: "Price Records", value: stats?.totalPriceRows ?? 0 },
                  { label: "Screener Data", value: stats?.totalScreenerData ?? 0 },
                  { label: "Technical Indicators", value: stats?.totalTechnicals ?? 0 },
                  { label: "News Articles", value: stats?.totalNews ?? 0 },
                  { label: "User Watchlists", value: stats?.totalWatchlists ?? 0 },
                  { label: "Admins", value: stats?.adminCount ?? 0 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
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
