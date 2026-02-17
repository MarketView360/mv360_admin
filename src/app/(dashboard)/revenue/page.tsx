"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Users, CreditCard, RefreshCw, Crown, Zap, Star } from "lucide-react";
import { fetchRevenueData } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface RevenueData {
  totalUsers: number;
  free: number;
  premium: number;
  elite: number;
  withBilling: number;
  estimatedMRR: number;
  newThisWeek: number;
  newThisMonth: number;
  conversionRate: number;
  revenueTimeline: Array<{
    month: string;
    free: number;
    premium: number;
    elite: number;
    estimatedRevenue: number;
  }>;
}

const TIER_COLORS = {
  free: "#94a3b8",
  premium: "#3b82f6",
  elite: "#8b5cf6",
};

const TIER_PRICES = {
  free: 0,
  premium: 19.99,
  elite: 49.99,
};

export default function RevenuePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RevenueData | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchRevenueData();
      setData(result);
    } catch (err) {
      console.error("Failed to load revenue data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const tierDistributionData = [
    { name: "Free", value: data.free, color: TIER_COLORS.free },
    { name: "Premium", value: data.premium, color: TIER_COLORS.premium },
    { name: "Elite", value: data.elite, color: TIER_COLORS.elite },
  ];

  const monthlyData = data.revenueTimeline.map(item => ({
    month: item.month.slice(5),
    Free: item.free,
    Premium: item.premium,
    Elite: item.elite,
  }));

  const revenueChartData = data.revenueTimeline.map(item => ({
    month: item.month.slice(5),
    revenue: item.estimatedRevenue,
  }));

  const projectedAnnualRevenue = data.estimatedMRR * 12;
  const avgRevenuePerUser = data.totalUsers > 0 ? data.estimatedMRR / data.totalUsers : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue Analytics</h1>
          <p className="text-muted-foreground">Track subscriptions, MRR, and revenue metrics</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.estimatedMRR.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${projectedAnnualRevenue.toFixed(2)} annual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Free to paid conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paying Customers</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.premium + data.elite}</div>
            <p className="text-xs text-muted-foreground">
              {data.premium} Premium, {data.elite} Elite
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgRevenuePerUser.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average revenue per user
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-slate-400" />
              Free Tier
            </CardTitle>
            <CardDescription>${TIER_PRICES.free}/month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold">{data.free}</div>
                <p className="text-sm text-muted-foreground">users</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>% of total</span>
                  <span className="font-semibold">{Math.round((data.free / data.totalUsers) * 100)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Monthly revenue</span>
                  <span className="font-semibold">$0.00</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Premium Tier
            </CardTitle>
            <CardDescription>${TIER_PRICES.premium}/month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold">{data.premium}</div>
                <p className="text-sm text-muted-foreground">users</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>% of total</span>
                  <span className="font-semibold">{Math.round((data.premium / data.totalUsers) * 100)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Monthly revenue</span>
                  <span className="font-semibold text-blue-600">${(data.premium * TIER_PRICES.premium).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-500" />
              Elite Tier
            </CardTitle>
            <CardDescription>${TIER_PRICES.elite}/month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold">{data.elite}</div>
                <p className="text-sm text-muted-foreground">users</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>% of total</span>
                  <span className="font-semibold">{Math.round((data.elite / data.totalUsers) * 100)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Monthly revenue</span>
                  <span className="font-semibold text-purple-600">${(data.elite * TIER_PRICES.elite).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tier Distribution</CardTitle>
            <CardDescription>Current user breakdown by subscription tier</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierDistributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value, percent }) => `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {tierDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
            <CardDescription>Estimated revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Signups by Tier (Last 6 Months)</CardTitle>
          <CardDescription>Monthly signup breakdown showing tier distribution</CardDescription>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Free" stackId="a" fill={TIER_COLORS.free} />
              <Bar dataKey="Premium" stackId="a" fill={TIER_COLORS.premium} />
              <Bar dataKey="Elite" stackId="a" fill={TIER_COLORS.elite} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
          <CardDescription>Important revenue and growth indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">New Signups This Week</p>
                <p className="text-2xl font-bold">{data.newThisWeek}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">New Signups This Month</p>
                <p className="text-2xl font-bold">{data.newThisMonth}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Users With Billing</p>
                <p className="text-2xl font-bold">{data.withBilling}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-500" />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Projected Annual Revenue</p>
                <p className="text-2xl font-bold">${projectedAnnualRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
