"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchDataQuality, runDataQualityValidation } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DimensionResult {
  score: number;
  issues: number;
  total: number;
  passed: number;
  details?: Record<string, number>;
}

interface ValidationRunRow {
  id: number;
  run_at: string;
  dimension: string;
  total: number;
  passed: number;
  failed: number;
  score: number;
}

interface DataQualityData {
  computed_at: string;
  overall_score: number;
  dimensions: {
    completeness: DimensionResult;
    accuracy: DimensionResult;
    consistency: DimensionResult;
    timeliness: DimensionResult;
    uniqueness: DimensionResult;
  };
  recent_runs: ValidationRunRow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIMENSION_CONFIG = [
  {
    key: "completeness" as const,
    label: "Completeness",
    weight: "25%",
    description: "Non-NULL indicator coverage",
  },
  {
    key: "accuracy" as const,
    label: "Accuracy",
    weight: "30%",
    description: "OHLCV sanity checks",
  },
  {
    key: "consistency" as const,
    label: "Consistency",
    weight: "20%",
    description: "Cross-table integrity",
  },
  {
    key: "timeliness" as const,
    label: "Timeliness",
    weight: "15%",
    description: "Data freshness",
  },
  {
    key: "uniqueness" as const,
    label: "Uniqueness",
    weight: "10%",
    description: "Duplicate detection",
  },
];

const ISSUE_TYPES = [
  { label: "Missing Fields", dimKey: "completeness" },
  { label: "Stale Data", dimKey: "timeliness" },
  { label: "Referential", dimKey: "consistency" },
  { label: "Outliers", dimKey: "accuracy" },
  { label: "Duplicate Records", dimKey: "uniqueness" },
];

function scoreColor(score: number) {
  if (score >= 99) return "text-emerald-400";
  if (score >= 97) return "text-green-400";
  if (score >= 95) return "text-yellow-400";
  return "text-red-400";
}

function scoreIcon(score: number) {
  if (score >= 97)
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Overall Score Ring ───────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 99 ? "#10b981" : score >= 97 ? "#22c55e" : score >= 95 ? "#eab308" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{score.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DataQualityPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [data, setData] = useState<DataQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDataQuality(token);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data quality");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const runValidation = async () => {
    if (!token || validating) return;
    setValidating(true);
    try {
      const result = await runDataQualityValidation(token);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  // Derive max issue count for bar chart scaling
  const maxIssues = data
    ? Math.max(1, ...ISSUE_TYPES.map((t) => data.dimensions[t.dimKey as keyof typeof data.dimensions]?.issues ?? 0))
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Quality</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Data validation, integrity checks, and quality scoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading && !validating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={runValidation} disabled={validating || loading}>
            {validating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            Run Validation
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Overall Score */}
      <Card>
        <CardContent className="flex items-center gap-8 py-6">
          {loading ? (
            <Skeleton className="h-[140px] w-[140px] rounded-full" />
          ) : (
            <ScoreRing score={data?.overall_score ?? 0} />
          )}
          <div>
            <h2 className="text-xl font-semibold">Overall Data Quality Score</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Based on 5 quality dimensions across all datasets
            </p>
            {!loading && data && (
              <div className="flex items-center gap-2 mt-3">
                {data.overall_score >= 97 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                )}
                <span
                  className={`text-sm font-medium ${data.overall_score >= 97 ? "text-emerald-400" : "text-yellow-400"
                    }`}
                >
                  {data.overall_score >= 99
                    ? "All systems nominal"
                    : data.overall_score >= 97
                      ? "Minor issues detected"
                      : "Attention required"}
                </span>
                {data.computed_at && (
                  <span className="text-xs text-muted-foreground ml-2">
                    · last validated {timeAgo(data.computed_at)}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5 Dimension Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {DIMENSION_CONFIG.map(({ key, label }) => {
          const dim = data?.dimensions[key];
          return (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </CardTitle>
                {loading ? (
                  <Skeleton className="h-4 w-4 rounded-full" />
                ) : dim ? (
                  scoreIcon(dim.score)
                ) : null}
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-20 mb-2" />
                    <Skeleton className="h-1.5 w-full" />
                  </>
                ) : dim ? (
                  <>
                    <div className={`text-2xl font-bold ${scoreColor(dim.score)}`}>
                      {dim.score.toFixed(1)}%
                    </div>
                    <Progress value={dim.score} className="mt-2 h-1.5" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {dim.issues.toLocaleString()} issue{dim.issues !== 1 ? "s" : ""} found
                    </p>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Issues Chart + Recent Validations */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Issues by Type — horizontal bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues by Type</CardTitle>
            <CardDescription>Breakdown of detected issues across dimensions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : (
              ISSUE_TYPES.map(({ label, dimKey }) => {
                const issues =
                  data?.dimensions[dimKey as keyof typeof data.dimensions]?.issues ?? 0;
                const pct = (issues / maxIssues) * 100;
                return (
                  <div key={dimKey} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-xs text-muted-foreground text-right">
                      {label}
                    </span>
                    <div className="flex-1 relative h-6 rounded overflow-hidden bg-muted/30">
                      <div
                        className="absolute left-0 top-0 h-full rounded bg-amber-400 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute right-2 top-0 flex h-full items-center text-xs font-medium">
                        {issues.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Validations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Validations</CardTitle>
            <CardDescription>Latest validation run results</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !data?.recent_runs?.length ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                No validation runs yet — click &ldquo;Run Validation&rdquo; to start
              </div>
            ) : (
              <div className="space-y-2">
                {data.recent_runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">{run.dimension}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {run.total.toLocaleString()} records ·{" "}
                        <span className="text-emerald-400">{run.passed.toLocaleString()} passed</span>
                        {run.failed > 0 && (
                          <> · <span className="text-red-400">{run.failed} failed</span></>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold ${run.score >= 99
                          ? "border-emerald-500/40 text-emerald-400"
                          : run.score >= 97
                            ? "border-green-500/40 text-green-400"
                            : "border-yellow-500/40 text-yellow-400"
                          }`}
                      >
                        {run.score.toFixed(1)}%
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo(run.run_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
