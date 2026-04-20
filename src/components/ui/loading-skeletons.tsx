"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ─── Progressive Loading Skeletons ───────────────────────────────────────────

/**
 * Card skeleton that matches the layout of stat cards
 */
export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/**
 * Grid skeleton for stat cards
 */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Table row skeleton
 */
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-5 w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Table skeleton with header and rows
 */
export function TableSkeleton({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-3">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Chart skeleton with gradient effect
 */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-muted/30"
      style={{ height }}
    >
      {/* Gradient bars effect */}
      <div className="absolute inset-0 flex items-end gap-1 px-4 pb-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gradient-to-t from-muted/60 to-muted/20 rounded-t animate-pulse"
            style={{
              height: `${Math.random() * 70 + 30}%`,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * List skeleton with staggered animation
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Full page skeleton for dashboard pages
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Stats Grid */}
      <StatCardsSkeleton count={4} />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={6} columns={5} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24 mb-1" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Progressive Loading Wrapper ───────────────────────────────────────────

import { ReactNode } from "react";

interface ProgressiveLoadingProps {
  isLoading: boolean;
  children: ReactNode;
  skeleton: ReactNode;
  delay?: number; // Minimum time to show skeleton before content
}

/**
 * Wrapper that shows skeleton during loading with optional minimum delay
 * Prevents skeleton flash for very fast loads
 */
export function ProgressiveLoading({
  isLoading,
  children,
  skeleton,
  delay = 0,
}: ProgressiveLoadingProps) {
  if (isLoading) {
    return <>{skeleton}</>;
  }
  return <>{children}</>;
}

// ─── Optimized Suspense Boundary ───────────────────────────────────────────

/**
 * Lazy loading boundary with optimized skeleton
 * Use this for components that are loaded via dynamic import
 */
export function LazyLoadingBoundary({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="relative">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="absolute inset-0 animate-ping">
          <Skeleton className="h-8 w-8 rounded-full opacity-20" />
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Presets ───────────────────────────────────────────────────────

export const SkeletonPresets = {
  // Quick stats
  quickStat: <StatCardSkeleton />,
  // Full stats row
  statsRow: <StatCardsSkeleton count={4} />,
  // Table view
  table: <TableSkeleton />,
  // Chart placeholder
  chart: <ChartSkeleton />,
  // Full dashboard
  dashboard: <DashboardSkeleton />,
};