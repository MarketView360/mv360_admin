"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { 
  fetchSyncLogs, 
  triggerGenesisPipeline, 
  fetchGenesisStatus, 
  fetchGenesisBudget,
  fetchGenesisQueueState,
  fetchGenesisFailedQueue,
  retryGenesisFailedJob,
  retryAllGenesisFailedJobs,
  clearGenesisFailedJobs,
  fetchGenesisAlertsConfig,
  setGenesisAlertsConfig,
  testGenesisAlerts
} from "@/lib/api";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Activity,
  Cpu,
  Zap,
  Loader2,
  RefreshCw,
  Trash2,
  Bell,
  BellRing
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
  const [alertsConfig, setAlertsConfig] = useState<{ webhook_url_set: boolean; webhook_url_prefix: string } | null>(null);
  const [queueState, setQueueState] = useState<any>(null);
  const [failedJobs, setFailedJobs] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [syncLogs, status, budget, alerts, queue, failed] = await Promise.all([
        fetchSyncLogs(50),
        session?.access_token
          ? fetchGenesisStatus(session.access_token).catch(() => null)
          : null,
        session?.access_token
          ? fetchGenesisBudget(session.access_token).catch(() => null)
          : null,
        session?.access_token
          ? fetchGenesisAlertsConfig(session.access_token).catch(() => null)
          : null,
        session?.access_token
          ? fetchGenesisQueueState(session.access_token).catch(() => null)
          : null,
        session?.access_token
          ? fetchGenesisFailedQueue(session.access_token).catch(() => [])
          : [],
      ]);
      setLogs(syncLogs);
      setStatusData(status);
      setBudgetData(budget);
      setAlertsConfig(alerts);
      setQueueState(queue);
      setFailedJobs(failed);
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

  const [webhookInput, setWebhookInput] = useState("");
  const [updatingAlerts, setUpdatingAlerts] = useState(false);

  const handleUpdateAlerts = async () => {
    if (!session?.access_token) return;
    setUpdatingAlerts(true);
    try {
      await setGenesisAlertsConfig(webhookInput, session.access_token);
      await loadData();
      setWebhookInput("");
    } catch (err) {
      console.error("Update alerts failed:", err);
    } finally {
      setUpdatingAlerts(false);
    }
  };

  const handleTestAlert = async () => {
    if (!session?.access_token) return;
    try {
      await testGenesisAlerts(session.access_token);
      alert("Test alert sent!");
    } catch (err) {
      console.error("Test alert failed:", err);
      alert("Test alert failed");
    }
  };

  const handleRetryJob = async (id: number) => {
    if (!session?.access_token) return;
    try {
      await retryGenesisFailedJob(id, session.access_token);
      await loadData();
    } catch (err) {
      console.error("Retry failed:", err);
    }
  };

  const handleRetryAll = async () => {
    if (!session?.access_token) return;
    try {
      await retryAllGenesisFailedJobs(session.access_token);
      await loadData();
    } catch (err) {
      console.error("Retry all failed:", err);
    }
  };

  const handleClearFailed = async () => {
    if (!session?.access_token) return;
    if (!confirm("Are you sure you want to clear all failed jobs?")) return;
    try {
      await clearGenesisFailedJobs(session.access_token);
      await loadData();
    } catch (err) {
      console.error("Clear failed:", err);
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

      <div className="grid gap-4 md:grid-cols-2">
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

        {alertsConfig && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Alerts Configuration</CardTitle>
                <CardDescription>Discord/Slack Webhook integration</CardDescription>
              </div>
              {alertsConfig.webhook_url_set ? (
                <BellRing className="h-5 w-5 text-emerald-500" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={alertsConfig.webhook_url_set ? "default" : "secondary"} className={alertsConfig.webhook_url_set ? "bg-emerald-600 text-white" : ""}>
                    {alertsConfig.webhook_url_set ? "Enabled" : "Disabled"}
                  </Badge>
                  {alertsConfig.webhook_url_set && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {alertsConfig.webhook_url_prefix}
                    </span>
                  )}
                  {alertsConfig.webhook_url_set && (
                    <Button variant="outline" size="sm" onClick={handleTestAlert} className="ml-auto">
                      Test Alert
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://hooks.slack.com/... (leave empty to disable)"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleUpdateAlerts} disabled={updatingAlerts}>
                    {updatingAlerts ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {statusData && (
          <Card>
            <CardHeader>
              <CardTitle>Live Status</CardTitle>
              <CardDescription>From GET /genesis/status</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto h-[300px]">
                {JSON.stringify(statusData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Queue Management</CardTitle>
              <CardDescription>Live job processing state</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleRetryAll} disabled={failedJobs.length === 0}>
                Retry All Failed
              </Button>
              <Button size="sm" variant="destructive" onClick={handleClearFailed} disabled={failedJobs.length === 0}>
                Clear Failed
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {queueState ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-muted p-2">
                    <div className="font-bold text-lg">{queueState.summary?.pending ?? 0}</div>
                    <div className="text-muted-foreground text-xs">Pending</div>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <div className="font-bold text-lg text-blue-600">{queueState.summary?.processing ?? 0}</div>
                    <div className="text-blue-600/70 text-xs">Processing</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <div className="font-bold text-lg text-emerald-600">{queueState.summary?.completed ?? 0}</div>
                    <div className="text-emerald-600/70 text-xs">Completed</div>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-2">
                    <div className="font-bold text-lg text-destructive">{queueState.summary?.failed ?? 0}</div>
                    <div className="text-destructive/70 text-xs">Failed</div>
                  </div>
                </div>

                {failedJobs.length > 0 && (
                  <div className="mt-4 border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticker</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Error</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failedJobs.slice(0, 5).map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-medium">{job.ticker}</TableCell>
                            <TableCell className="text-xs">{job.job_type}</TableCell>
                            <TableCell className="text-xs text-destructive max-w-[150px] truncate" title={job.error_message}>
                              {job.error_message}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => handleRetryJob(job.id)}>
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {failedJobs.length > 5 && (
                      <div className="bg-muted p-2 text-center text-xs text-muted-foreground">
                        + {failedJobs.length - 5} more failed jobs
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Queue state unavailable
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
