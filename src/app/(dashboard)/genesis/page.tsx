"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchSyncLogs, triggerGenesisPipeline, fetchGenesisStatus, fetchGenesisBudget } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Loader2,
  Cpu,
  Zap,
  RefreshCw,
  Activity,
} from "lucide-react";

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
  metadata: Record<string, unknown> | null;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed" || status === "success") {
    return (
      <Badge variant="default" className="bg-emerald-600 text-white">
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

export default function GenesisPage() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<Record<string, unknown> | null>(null);
  const [budgetData, setBudgetData] = useState<Record<string, unknown> | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [syncLogs, status, budget] = await Promise.all([
        fetchSyncLogs(50),
        session?.access_token
          ? fetchGenesisStatus(session.access_token).catch(() => null)
          : null,
        session?.access_token
          ? fetchGenesisBudget(session.access_token).catch(() => null)
          : null,
      ]);
      setLogs(syncLogs);
      setStatusData(status);
      setBudgetData(budget);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrigger = async (type: "daily" | "weekly" | "full") => {
    if (!session?.access_token) return;
    setTriggering(type);
    try {
      await triggerGenesisPipeline(type, session.access_token);
      await loadData();
    } catch (err: unknown) {
      console.error("Trigger failed:", err);
    } finally {
      setTriggering(null);
    }
  };

  const totalRecords = logs.reduce(
    (sum, l) => sum + (l.records_processed ?? 0),
    0
  );
  const totalFailed = logs.reduce(
    (sum, l) => sum + (l.records_failed ?? 0),
    0
  );
  const failedCount = logs.filter(
    (l) => l.status === "failed" || l.status === "error"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Genesis Engine</h1>
          <p className="text-muted-foreground">
            Pipeline monitoring, sync logs & manual triggers
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => handleTrigger("daily")}
            disabled={!!triggering}
          >
            {triggering === "daily" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Daily
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleTrigger("weekly")}
            disabled={!!triggering}
          >
            {triggering === "weekly" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Weekly
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleTrigger("full")}
            disabled={!!triggering}
          >
            {triggering === "full" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Full
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Records Synced
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                totalRecords.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {logs.length} pipeline runs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Records Failed
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalFailed > 0 ? "text-destructive" : ""}`}>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                totalFailed.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all pipeline runs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed Runs
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${failedCount > 0 ? "text-destructive" : ""}`}>
              {loading ? <Skeleton className="h-8 w-12" /> : failedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {failedCount === 0
                ? "All pipelines healthy"
                : "Review errors below"}
            </p>
          </CardContent>
        </Card>
      </div>

      {budgetData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>API Budget</CardTitle>
              <CardDescription>EODHD daily call usage</CardDescription>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Used Today</p>
                <p className="text-2xl font-bold">
                  {((budgetData as Record<string, Record<string, unknown>>)?.data?.used as number ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold">
                  {((budgetData as Record<string, Record<string, unknown>>)?.data?.remaining as number ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Limit</p>
                <p className="text-2xl font-bold">
                  {((budgetData as Record<string, Record<string, unknown>>)?.data?.limit as number ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {statusData && (
        <Card>
          <CardHeader>
            <CardTitle>Live Status</CardTitle>
            <CardDescription>From GET /genesis/status</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto">
              {JSON.stringify(statusData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sync Log History</CardTitle>
          <CardDescription>Last 50 pipeline runs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sync logs found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sync Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const durationStr = log.duration_ms
                    ? log.duration_ms > 60000
                      ? `${(log.duration_ms / 60000).toFixed(1)}m`
                      : `${(log.duration_ms / 1000).toFixed(1)}s`
                    : "—";

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium capitalize">
                        {log.sync_type}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(log.started_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">{durationStr}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {log.records_processed?.toLocaleString() ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {log.records_failed ?? 0}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                        {log.error_message || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
