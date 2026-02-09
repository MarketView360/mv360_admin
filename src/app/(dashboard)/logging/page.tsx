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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Search,
  AlertTriangle,
  Shield,
  ScrollText,
  Filter,
} from "lucide-react";
import { fetchSyncLogs, fetchSecurityEvents } from "@/lib/api";

interface SyncLog {
  id: string;
  task_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  records_processed: number | null;
  error_message: string | null;
  api_units_used: number | null;
}

interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: string;
  ip_address: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function LogLevelBadge({ status }: { status: string }) {
  if (status === "completed" || status === "success") {
    return <Badge className="bg-emerald-600/20 text-emerald-400 border-0">INFO</Badge>;
  }
  if (status === "failed" || status === "error") {
    return <Badge className="bg-red-600/20 text-red-400 border-0">ERROR</Badge>;
  }
  return <Badge className="bg-yellow-600/20 text-yellow-400 border-0">WARN</Badge>;
}

export default function LoggingPage() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [logs, events] = await Promise.all([
        fetchSyncLogs(100),
        fetchSecurityEvents(100),
      ]);
      setSyncLogs(logs);
      setSecurityEvents(events);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSyncLogs = syncLogs.filter(
    (l) =>
      !filter ||
      l.task_name.toLowerCase().includes(filter.toLowerCase()) ||
      l.status.toLowerCase().includes(filter.toLowerCase()) ||
      (l.error_message ?? "").toLowerCase().includes(filter.toLowerCase())
  );

  const filteredSecurityEvents = securityEvents.filter(
    (e) =>
      !filter ||
      e.event_type.toLowerCase().includes(filter.toLowerCase()) ||
      (e.ip_address ?? "").includes(filter)
  );

  const errorCount = syncLogs.filter(
    (l) => l.status === "failed" || l.status === "error"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logging</h1>
          <p className="text-muted-foreground">
            Ingestion logs, errors & security events
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Log Entries
            </CardTitle>
            <ScrollText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncLogs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Errors
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${errorCount > 0 ? "text-destructive" : ""}`}>
              {errorCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Security Events
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityEvents.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter logs by task, status, error message..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setFilter("")}
          disabled={!filter}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="ingestion">
        <TabsList>
          <TabsTrigger value="ingestion">
            Ingestion Logs ({filteredSyncLogs.length})
          </TabsTrigger>
          <TabsTrigger value="security">
            Security Events ({filteredSecurityEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingestion">
          <Card>
            <CardHeader>
              <CardTitle>Ingestion Pipeline Logs</CardTitle>
              <CardDescription>Genesis Engine sync history</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Level</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead className="text-right">Records</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSyncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <LogLevelBadge status={log.status} />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.task_name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(log.started_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {log.records_processed?.toLocaleString() ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs">
                            {log.error_message || (
                              <span className="text-muted-foreground">
                                Completed successfully
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>Auth events and security audit log</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredSecurityEvents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No security events found.
                </p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Type</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSecurityEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {event.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[150px]">
                            {event.user_id}
                          </TableCell>
                          <TableCell className="text-xs">
                            {event.ip_address ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
