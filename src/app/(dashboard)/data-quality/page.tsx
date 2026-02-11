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
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  AlertTriangle,
  CheckCircle2,
  Clock,
  DatabaseZap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface StaleCompany {
  id: number;
  ticker: string;
  name: string;
  last_updated: string;
}

interface DataQuality {
  totalCompanies: number;
  companiesWithMetrics: number;
  companiesWithPrices: number;
  staleCompanies: StaleCompany[];
  recentPriceCount: number;
  totalPriceRows: number;
  totalDividendRows: number;
  totalTechnicalRows: number;
}

export default function DataQualityPage() {
  const [data, setData] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        companiesRes,
        metricsRes,
        pricesCompaniesRes,
        staleRes,
        recentPricesRes,
        totalPricesRes,
        dividendsRes,
        technicalsRes,
      ] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("company_metrics_ttm").select("id", { count: "exact", head: true }),
        supabase.from("price_data").select("company_id", { count: "exact", head: true }),
        supabase
          .from("companies")
          .select("id, ticker, name, last_updated")
          .lt("last_updated", new Date(Date.now() - 7 * 86400000).toISOString())
          .not("last_updated", "is", null)
          .order("last_updated", { ascending: true })
          .limit(25),
        supabase
          .from("price_data")
          .select("id", { count: "exact", head: true })
          .gte("date", new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0]),
        supabase.from("price_data").select("id", { count: "exact", head: true }),
        supabase.from("dividend_history").select("id", { count: "exact", head: true }),
        supabase.from("technical_indicators").select("id", { count: "exact", head: true }),
      ]);

      setData({
        totalCompanies: companiesRes.count ?? 0,
        companiesWithMetrics: metricsRes.count ?? 0,
        companiesWithPrices: pricesCompaniesRes.count ?? 0,
        staleCompanies: (staleRes.data as StaleCompany[]) ?? [],
        recentPriceCount: recentPricesRes.count ?? 0,
        totalPriceRows: totalPricesRes.count ?? 0,
        totalDividendRows: dividendsRes.count ?? 0,
        totalTechnicalRows: technicalsRes.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metricsCoverage = data
    ? data.totalCompanies > 0
      ? Math.round((data.companiesWithMetrics / data.totalCompanies) * 100)
      : 0
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Quality</h1>
          <p className="text-muted-foreground">
            Coverage checks, stale data & integrity monitoring
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Metrics Coverage
            </CardTitle>
            <DatabaseZap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metricsCoverage}%</div>
                <Progress value={metricsCoverage} className="mt-2 h-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {data?.companiesWithMetrics.toLocaleString()} / {data?.totalCompanies.toLocaleString()} companies
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Price Data
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.totalPriceRows.toLocaleString()}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data?.recentPriceCount.toLocaleString()} in last 2 days
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dividend Records
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.totalDividendRows.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Technical Indicators
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.totalTechnicalRows.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Stale Companies
          </CardTitle>
          <CardDescription>
            Companies not updated in the last 7 days (top 25)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data?.staleCompanies.length === 0 ? (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              All companies are up to date
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Staleness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.staleCompanies.map((company) => {
                    const daysSince = Math.floor(
                      (Date.now() - new Date(company.last_updated).getTime()) /
                        86400000
                    );
                    return (
                      <TableRow key={company.id}>
                        <TableCell className="font-mono font-medium">
                          {company.ticker}
                        </TableCell>
                        <TableCell className="text-sm">
                          {company.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(company.last_updated).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={daysSince > 30 ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            {daysSince}d ago
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
