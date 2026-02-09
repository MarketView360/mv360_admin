"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  BarChart3,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { fetchOverviewStats } from "@/lib/api";

interface SyncLog {
  id: string;
  task_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  records_processed: number | null;
  error_message: string | null;
}

interface OverviewStats {
  totalCompanies: number;
  totalPriceRows: number;
  totalUsers: number;
  recentSyncs: SyncLog[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
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

export default function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          MarketView360 system overview
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Companies"
          value={stats?.totalCompanies.toLocaleString() ?? "—"}
          icon={Building2}
          description="Tracked tickers"
        />
        <StatCard
          title="Price Records"
          value={stats?.totalPriceRows.toLocaleString() ?? "—"}
          icon={BarChart3}
          description="Total price_data rows"
        />
        <StatCard
          title="Users"
          value={stats?.totalUsers.toLocaleString() ?? "—"}
          icon={Users}
          description="Registered accounts"
        />
        <StatCard
          title="System Status"
          value={
            stats?.recentSyncs?.[0]?.status === "completed"
              ? "Healthy"
              : "Check Logs"
          }
          icon={Activity}
          description="Last pipeline run"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Pipeline Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats?.recentSyncs?.length ? (
            <p className="text-sm text-muted-foreground">
              No sync logs found. Genesis Engine may not have run yet.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentSyncs.map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={sync.status} />
                    <div>
                      <p className="text-sm font-medium">{sync.task_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sync.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {sync.records_processed != null && (
                      <span className="text-muted-foreground">
                        {sync.records_processed.toLocaleString()} records
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
