"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Users,
  Building2,
  Newspaper,
  Eye,
  Database,
  CheckCircle2,
  Clock,
  BarChart3,
  Activity,
} from "lucide-react";
import type { DashboardTickerStats, LastSyncInfo } from "@/lib/api";

interface StatsTickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: DashboardTickerStats | null;
  syncInfo: LastSyncInfo | null;
}

export function StatsTickerDialog({
  open,
  onOpenChange,
  stats,
  syncInfo,
}: StatsTickerDialogProps) {
  const formatSyncTime = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getTimeSince = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5" /> Platform Statistics
          </DialogTitle>
          <DialogDescription>Comprehensive data metrics and pipeline status</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" /> Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalCompanies.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total companies tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" /> Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalUsers.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" /> Watchlists
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.activeWatchlists.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Active watchlists</p>
              </CardContent>
            </Card>
          </div>

          {/* Data Volume */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" /> Data Volume
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price Records</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums">{(stats?.priceRecords || 0).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">({((stats?.priceRecords || 0) / 1000000).toFixed(2)}M)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">News Articles</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums">{(stats?.newsArticles || 0).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">({((stats?.newsArticles || 0) / 1000).toFixed(1)}K)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Records</span>
                <span className="text-sm font-bold tabular-nums">
                  {((stats?.priceRecords || 0) + (stats?.newsArticles || 0) + (stats?.totalCompanies || 0)).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Last Sync Info */}
          <Card className={syncInfo?.lastSyncTime ? "border-emerald-500/40" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" /> Data Pipeline Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncInfo && syncInfo.lastSyncTime ? (
                <div className="space-y-4">
                  {/* Overall Status */}
                  <div className="space-y-2 pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Last Data Ingestion
                      </span>
                      <Badge className="bg-emerald-600/20 text-emerald-600 border-0 font-mono text-xs">
                        {getTimeSince(syncInfo.lastSyncTime)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Timestamp
                      </span>
                      <span className="text-xs font-mono">{formatSyncTime(syncInfo.lastSyncTime)}</span>
                    </div>
                  </div>

                  {/* Per-Table Breakdown */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Syncs by Table</p>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {syncInfo.syncsByTable.map((table) => (
                        <div
                          key={table.tableName}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium font-mono">{table.tableName}</span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  table.status === "completed"
                                    ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                    : table.status === "failed"
                                    ? "border-red-500/40 text-red-600 bg-red-500/10"
                                    : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                                }`}
                              >
                                {table.status || "unknown"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{(table.recordsProcessed || 0).toLocaleString()} records</span>
                              <span>•</span>
                              <span>{table.lastSync ? formatSyncTime(table.lastSync) : "—"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total Tables Synced</span>
                      <span className="font-semibold">{syncInfo.syncsByTable.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Successful Syncs</span>
                      <span className="font-semibold text-emerald-600">
                        {syncInfo.syncsByTable.filter((t) => t.status === "completed").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Failed Syncs</span>
                      <span className="font-semibold text-destructive">
                        {syncInfo.syncsByTable.filter((t) => t.status === "failed").length}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No sync data available</p>
                  <p className="text-xs text-muted-foreground mt-1">Waiting for first data ingestion</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" /> System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data Freshness</span>
                <Badge className={`${syncInfo?.lastSyncTime ? "bg-emerald-600/20 text-emerald-600" : "bg-amber-600/20 text-amber-600"} border-0`}>
                  {syncInfo?.lastSyncTime ? "Up to date" : "Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pipeline Status</span>
                <Badge className="bg-emerald-600/20 text-emerald-600 border-0">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API Status</span>
                <Badge className="bg-emerald-600/20 text-emerald-600 border-0">Online</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
