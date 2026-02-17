"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Building2, Newspaper, Eye, Database, Clock } from "lucide-react";
import { fetchDashboardTickerStats, fetchLastSyncInfo, type DashboardTickerStats, type LastSyncInfo } from "@/lib/api";
import { StatsTickerDialog } from "./StatsTickerDialog";

export function StatsTickerBanner() {
  const [stats, setStats] = useState<DashboardTickerStats | null>(null);
  const [syncInfo, setSyncInfo] = useState<LastSyncInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, syncData] = await Promise.all([
          fetchDashboardTickerStats(),
          fetchLastSyncInfo(),
        ]);
        setStats(statsData);
        setSyncInfo(syncData);
      } catch (err) {
        console.error("Failed to load ticker data:", err);
      }
    };

    loadData();
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const lastSyncDisplay = syncInfo?.lastSyncTime
    ? new Date(syncInfo.lastSyncTime).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Pending";

  const tickerItems = [
    { icon: Building2, label: "Companies", value: stats.totalCompanies.toLocaleString(), color: "text-blue-400" },
    { icon: Users, label: "Total Users", value: stats.totalUsers.toLocaleString(), color: "text-emerald-400" },
    { icon: Database, label: "Price Records", value: (stats.priceRecords / 1000000).toFixed(1) + "M", color: "text-purple-400" },
    { icon: Newspaper, label: "News Articles", value: stats.newsArticles.toLocaleString(), color: "text-amber-400" },
    { icon: Eye, label: "Watchlists", value: stats.activeWatchlists.toLocaleString(), color: "text-cyan-400" },
    { icon: Clock, label: "Last Sync", value: lastSyncDisplay, color: syncInfo?.lastSyncTime ? "text-emerald-400" : "text-amber-400" },
    { icon: TrendingUp, label: "Data Status", value: "Live", color: "text-emerald-400" },
  ];

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="w-full bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-b border-slate-700 hover:from-slate-700 hover:via-slate-800 hover:to-slate-700 transition-all cursor-pointer group"
      >
        <div className="relative overflow-hidden">
          <div className="animate-marquee-slow whitespace-nowrap py-2 px-4 flex items-center gap-6 text-xs">
            {[...tickerItems, ...tickerItems].map((item, idx) => {
              const Icon = item.icon;
              return (
                <span key={idx} className="inline-flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
                  <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                  <span className="font-semibold">{item.label}:</span>
                  <span className={`font-mono font-bold ${item.color}`}>{item.value}</span>
                  {idx < tickerItems.length * 2 - 1 && <span className="text-slate-600 mx-2">|</span>}
                </span>
              );
            })}
          </div>
        </div>
      </button>

      <StatsTickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        stats={stats}
        syncInfo={syncInfo}
      />
    </>
  );
}
