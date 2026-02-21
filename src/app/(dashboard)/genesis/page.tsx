"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { 
  fetchGenesisLogs,
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
  BellRing,
  ChevronDown,
  ChevronRight
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
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<Record<string, unknown> | null>(null);
  const [budgetData, setBudgetData] = useState<Record<string, unknown> | null>(null);
  const [alertsConfig, setAlertsConfig] = useState<{ webhook_url_set: boolean; webhook_url_prefix: string } | null>(null);
  const [queueState, setQueueState] = useState<any>(null);
  const [failedJobs, setFailedJobs] = useState<any[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const sessionRef = useRef(session);
  const isRunningRef = useRef(false);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => {
    isRunningRef.current = (statusData as any)?.data?.running === true;
  }, [statusData]);

  const pollLive = async () => {
    const token = sessionRef.current?.access_token;
    if (!token) return;
    const [status, queue, failed, syncLogs] = await Promise.all([
      fetchGenesisStatus(token).catch(() => null),
      fetchGenesisQueueState(token).catch(() => null),
      fetchGenesisFailedQueue(token).catch(() => []),
      fetchGenesisLogs(token, 50).catch(() => null),
    ]);
    setStatusData(status);
    setQueueState(queue);
    setFailedJobs(Array.isArray(failed) ? failed : []);
    if (syncLogs) setLogs(syncLogs);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = sessionRef.current?.access_token;
      const [syncLogs, status, budget, alerts, queue, failed] = await Promise.all([
        token ? fetchGenesisLogs(token, 50).catch(() => []) : [],
        token ? fetchGenesisStatus(token).catch(() => null) : null,
        token ? fetchGenesisBudget(token).catch(() => null) : null,
        token ? fetchGenesisAlertsConfig(token).catch(() => null) : null,
        token ? fetchGenesisQueueState(token).catch(() => null) : null,
        token ? fetchGenesisFailedQueue(token).catch(() => []) : [],
      ]);
      setLogs(syncLogs);
      setStatusData(status);
      setBudgetData(budget);
      setAlertsConfig(alerts);
      setQueueState(queue);
      setFailedJobs(Array.isArray(failed) ? failed : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable 5s polling interval — set up once on mount, reads running state via ref
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunningRef.current) pollLive();
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrigger = async (type: "daily" | "weekly" | "full") => {
    if (!session?.access_token) return;
    setTriggering(type);
    setTriggerError(null);
    try {
      await triggerGenesisPipeline(type, session.access_token);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        const parsed = JSON.parse(msg);
        setTriggerError(parsed.error ?? msg);
      } catch {
        setTriggerError(msg);
      }
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

      {triggerError && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <span>{triggerError}</span>
          <button onClick={() => setTriggerError(null)} className="ml-4 text-destructive/70 hover:text-destructive">✕</button>
        </div>
      )}

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
        {statusData && (() => {
          const d = (statusData as any)?.data ?? {};
          const isRunning = d.running === true;
          const budget = d.api_budget ?? {};
          const svc = d.service_info ?? {};
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Live Status</CardTitle>
                  <CardDescription>Genesis pipeline engine</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <>
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-medium text-emerald-500">Running</span>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-3 w-3">
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground/40"></span>
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">Idle</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Processed</p>
                    <p className="text-xl font-bold">{(d.processed ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Failed</p>
                    <p className={`text-xl font-bold ${(d.failed ?? 0) > 0 ? "text-destructive" : ""}`}>{(d.failed ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Total Tickers</p>
                    <p className="text-xl font-bold">{(d.total_tickers ?? 0).toLocaleString()}</p>
                  </div>
                </div>
                {isRunning && (d.total_tickers ?? 0) > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{Math.round(((d.processed ?? 0) / d.total_tickers) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round(((d.processed ?? 0) / d.total_tickers) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">API Used Today</p>
                    <p className="font-medium">{(budget.used ?? 0).toLocaleString()} / {(budget.limit ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Uptime</p>
                    <p className="font-medium font-mono">{svc.uptime ?? "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Queue Management</CardTitle>
              <CardDescription>Live job processing state</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {(statusData as any)?.data?.running && (
                <span className="flex items-center gap-1 text-xs text-blue-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Live
                </span>
              )}
              <Button size="sm" variant="outline" onClick={handleRetryAll} disabled={(failedJobs?.length ?? 0) === 0}>
                Retry All Failed
              </Button>
              <Button size="sm" variant="destructive" onClick={handleClearFailed} disabled={(failedJobs?.length ?? 0) === 0}>
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
                    <div className="font-bold text-lg text-blue-600 flex items-center justify-center gap-1">
                      {(queueState.summary?.processing ?? 0) > 0 && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                      )}
                      {queueState.summary?.processing ?? 0}
                    </div>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sync Log History</CardTitle>
            <CardDescription>Last 50 pipeline runs</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {(statusData as any)?.data?.running && (
              <span className="flex items-center gap-1 text-xs text-emerald-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Auto-refreshing
              </span>
            )}
            <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
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

                  const isActive = log.status === "running";
                  const hasSamples = Array.isArray((log.metadata as any)?.failure_samples) && (log.metadata as any).failure_samples.length > 0;
                  const isExpanded = expandedLogId === log.id;
                  const canExpand = hasSamples || !!log.error_message;
                  return (
                    <Fragment key={log.id}>
                      <TableRow
                        className={`${isActive ? "bg-emerald-500/5" : ""} ${canExpand ? "cursor-pointer hover:bg-muted/50" : ""}`}
                        onClick={() => canExpand && setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <TableCell className="font-medium capitalize">
                          <div className="flex items-center gap-1">
                            {canExpand && (
                              isExpanded
                                ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            )}
                            {log.sync_type}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge variant="default" className="bg-emerald-600 text-white">
                              <span className="relative flex h-2 w-2 mr-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                              </span>
                              running
                            </Badge>
                          ) : (
                            <StatusBadge status={log.status} />
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(log.started_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {isActive
                            ? `${Math.round((Date.now() - new Date(log.started_at).getTime()) / 1000)}s elapsed`
                            : durationStr}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {log.records_processed?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {(log.records_failed ?? 0) > 0 ? (
                            <span className="text-destructive font-medium">{log.records_failed}</span>
                          ) : 0}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                          {log.error_message || "—"}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-0">
                            <div className="p-4 space-y-3">
                              {log.error_message && (
                                <div>
                                  <p className="text-xs font-semibold text-destructive mb-1">Pipeline Error</p>
                                  <p className="text-xs font-mono bg-destructive/10 rounded p-2 text-destructive">{log.error_message}</p>
                                </div>
                              )}
                              {hasSamples && (
                                <div>
                                  <p className="text-xs font-semibold mb-2">
                                    Failed Tickers ({(log.metadata as any).failure_samples.length}
                                    {(log.metadata as any).failure_samples_truncated ? "+ more" : ""})
                                  </p>
                                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                    {(log.metadata as any).failure_samples.map((s: any, i: number) => (
                                      <div key={i} className="flex gap-3 text-xs font-mono bg-background rounded px-3 py-1.5 border">
                                        <span className="font-semibold w-24 shrink-0 text-foreground">{s.ticker}</span>
                                        <span className="text-destructive truncate">{s.error || "unknown error"}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
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
