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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Users,
  ArrowDownRight,
  CreditCard,
} from "lucide-react";
import { fetchRevenueData } from "@/lib/api";
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

interface RevenueData {
  mrr: number;
  totalRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  revenueByMonth: { month: string; revenue: number }[];
}

const PLAN_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899"];

// Placeholder plan distribution — replace with real data when subscriptions table exists
const planDistribution = [
  { name: "Free", value: 10, color: PLAN_COLORS[0] },
  { name: "Pro", value: 3, color: PLAN_COLORS[1] },
  { name: "Enterprise", value: 1, color: PLAN_COLORS[2] },
];

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendDown,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  trend?: string;
  trendDown?: boolean;
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
          <p
            className={`mt-1 flex items-center text-xs ${
              trendDown ? "text-destructive" : "text-emerald-500"
            }`}
          >
            {trendDown && <ArrowDownRight className="mr-1 h-3 w-3" />}
            {!trendDown && <TrendingUp className="mr-1 h-3 w-3" />}
            {trend}
          </p>
        )}
        {description && !trend && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const hasRevenue = data && data.totalRevenue > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Revenue</h1>
        <p className="text-muted-foreground">
          Subscription tracking, MRR & churn metrics
        </p>
      </div>

      {!hasRevenue && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Revenue Data Yet</h3>
            <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
              Revenue tracking will activate once you set up a subscriptions/payments
              table in Supabase. The charts below show placeholder data for preview.
            </p>
            <Badge variant="outline" className="mt-4">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="mb-3 h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Monthly Recurring Revenue"
              value={`$${(data?.mrr ?? 0).toLocaleString()}`}
              icon={DollarSign}
              description="Current MRR"
            />
            <StatCard
              title="Total Revenue"
              value={`$${(data?.totalRevenue ?? 0).toLocaleString()}`}
              icon={TrendingUp}
              description="All time"
            />
            <StatCard
              title="Active Subscriptions"
              value={String(data?.activeSubscriptions ?? 0)}
              icon={Users}
              description="Paying customers"
            />
            <StatCard
              title="Churn Rate"
              value={`${(data?.churnRate ?? 0).toFixed(1)}%`}
              icon={ArrowDownRight}
              description="Monthly churn"
              trend={
                data?.churnRate && data.churnRate > 5
                  ? `${data.churnRate.toFixed(1)}% — above target`
                  : undefined
              }
              trendDown={data?.churnRate ? data.churnRate > 5 : false}
            />
          </>
        )}
      </div>

      <Tabs defaultValue="mrr">
        <TabsList>
          <TabsTrigger value="mrr">MRR Trend</TabsTrigger>
          <TabsTrigger value="plans">Plan Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="mrr">
          <Card>
            <CardHeader>
              <CardTitle>MRR Over Time</CardTitle>
              <CardDescription>Monthly recurring revenue trend</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.revenueByMonth && data.revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.revenueByMonth}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value) => [`$${value}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    No revenue data to display. Connect a payment provider to get started.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Plan Distribution</CardTitle>
              <CardDescription>
                Current user distribution across plans (placeholder)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {planDistribution.map((plan) => (
                    <div key={plan.name} className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: plan.color }}
                      />
                      <span className="text-sm font-medium">{plan.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {plan.value} users
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
