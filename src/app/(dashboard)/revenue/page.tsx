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
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  RefreshCw,
  UserPlus,
  Crown,
} from "lucide-react";
import { fetchRevenueData } from "@/lib/api";
import {
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
  Legend,
} from "recharts";

interface RevenueData {
  totalUsers: number;
  free: number;
  premium: number;
  pro: number;
  withBilling: number;
  estimatedMRR: number;
  newThisWeek: number;
  newThisMonth: number;
  conversionRate: number;
  revenueTimeline: {
    month: string;
    free: number;
    premium: number;
    pro: number;
    estimatedRevenue: number;
  }[];
}

const TIER_COLORS: Record<string, string> = {
  free: "#6366f1",
  premium: "#f59e0b",
  pro: "#10b981",
};

const CHART_TOOLTIP = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--foreground))",
};

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchRevenueData();
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const S = () => <Skeleton className="h-8 w-20" />;

  const pieData = data
    ? [
        { name: "Free", value: data.free, color: TIER_COLORS.free },
        { name: "Premium", value: data.premium, color: TIER_COLORS.premium },
        { name: "Pro", value: data.pro, color: TIER_COLORS.pro },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue & Subscriptions</h1>
          <p className="text-muted-foreground">
            Real subscription data from user_profiles
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimated MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className="text-2xl font-bold">${data?.estimatedMRR.toFixed(2)}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data?.premium ?? 0} premium + {data?.pro ?? 0} pro
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className={`text-2xl font-bold ${(data?.conversionRate ?? 0) > 0 ? "text-emerald-500" : ""}`}>
                  {data?.conversionRate ?? 0}%
                </div>
                <p className="mt-1 text-xs text-muted-foreground">free → paid</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className="text-2xl font-bold">{data?.newThisMonth ?? 0}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data?.newThisWeek ?? 0} this week
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paying Users</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <S /> : (
              <>
                <div className="text-2xl font-bold">{(data?.premium ?? 0) + (data?.pro ?? 0)}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  of {data?.totalUsers ?? 0} total &middot; {data?.withBilling ?? 0} with billing
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stacked Bar: Monthly signups by tier */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Signups by Tier</CardTitle>
            <CardDescription>User acquisition breakdown (last 6 months)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : (data?.revenueTimeline.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.revenueTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="free" stackId="a" fill={TIER_COLORS.free} radius={[0, 0, 0, 0]} name="Free" />
                  <Bar dataKey="premium" stackId="a" fill={TIER_COLORS.premium} name="Premium" />
                  <Bar dataKey="pro" stackId="a" fill={TIER_COLORS.pro} radius={[4, 4, 0, 0]} name="Pro" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie: Current distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Tier Distribution</CardTitle>
            <CardDescription>Current user split</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="mx-auto h-48 w-48 rounded-full" />
            ) : pieData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No users.</p>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3">
                  {pieData.map((t) => (
                    <Badge key={t.name} variant="outline" className="gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}: {t.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription details */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Subscription Breakdown
            </CardTitle>
            <CardDescription>Detailed tier metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Free Users", value: data?.free ?? 0, color: TIER_COLORS.free },
                  { label: "Premium Users ($19.99/mo)", value: data?.premium ?? 0, color: TIER_COLORS.premium },
                  { label: "Pro Users ($49.99/mo)", value: data?.pro ?? 0, color: TIER_COLORS.pro },
                ].map((row) => {
                  const pct = (data?.totalUsers ?? 1) > 0 ? Math.round((row.value / (data?.totalUsers ?? 1)) * 100) : 0;
                  return (
                    <div key={row.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-semibold tabular-nums">{row.value} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: row.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Revenue Summary
            </CardTitle>
            <CardDescription>Estimated revenue from current subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Premium Revenue</span>
                  <span className="font-semibold tabular-nums">${((data?.premium ?? 0) * 19.99).toFixed(2)}/mo</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pro Revenue</span>
                  <span className="font-semibold tabular-nums">${((data?.pro ?? 0) * 49.99).toFixed(2)}/mo</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Total Estimated MRR</span>
                  <span className="font-bold text-lg tabular-nums">${data?.estimatedMRR.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Estimated ARR</span>
                  <span className="font-semibold tabular-nums">${((data?.estimatedMRR ?? 0) * 12).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Users with Billing ID</span>
                  <span className="font-semibold tabular-nums">{data?.withBilling ?? 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
