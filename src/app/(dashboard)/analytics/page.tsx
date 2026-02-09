"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Eye, MousePointerClick } from "lucide-react";
import { fetchUserSignupsByDay } from "@/lib/api";
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
} from "recharts";

interface DailySignup {
  date: string;
  count: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
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
        {trend && (
          <p className="mt-1 text-xs text-emerald-500">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [signups, setSignups] = useState<{ created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserSignupsByDay(90)
      .then(setSignups)
      .finally(() => setLoading(false));
  }, []);

  const dailyData: DailySignup[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of signups) {
      const day = s.created_at.split("T")[0];
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [signups]);

  const cumulativeData = useMemo(() => {
    let total = 0;
    return dailyData.map((d) => {
      total += d.count;
      return { date: d.date, total };
    });
  }, [dailyData]);

  const totalSignups = signups.length;
  const last7 = signups.filter(
    (s) =>
      new Date(s.created_at).getTime() > Date.now() - 7 * 86400000
  ).length;
  const last30 = signups.filter(
    (s) =>
      new Date(s.created_at).getTime() > Date.now() - 30 * 86400000
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          User activity, signups & engagement metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users (90d)"
          value={loading ? "—" : totalSignups}
          icon={Users}
        />
        <StatCard
          title="Signups (7d)"
          value={loading ? "—" : last7}
          icon={TrendingUp}
          trend={last7 > 0 ? `+${last7} this week` : undefined}
        />
        <StatCard
          title="Signups (30d)"
          value={loading ? "—" : last30}
          icon={MousePointerClick}
        />
        <StatCard
          title="Avg Daily"
          value={
            loading
              ? "—"
              : dailyData.length > 0
              ? (totalSignups / Math.max(dailyData.length, 1)).toFixed(1)
              : "0"
          }
          icon={Eye}
        />
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Signups</TabsTrigger>
          <TabsTrigger value="cumulative">Cumulative Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily User Signups</CardTitle>
              <CardDescription>New registrations per day (last 90 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : dailyData.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No signup data available for the selected period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cumulative">
          <Card>
            <CardHeader>
              <CardTitle>Cumulative User Growth</CardTitle>
              <CardDescription>Running total of signups</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : cumulativeData.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No data available.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--chart-2))"
                      fill="hsl(var(--chart-2))"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
