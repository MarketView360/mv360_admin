"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Building2, Newspaper, Eye, Database } from "lucide-react";
import { fetchDashboardTickerStats, type DashboardTickerStats } from "@/lib/api";

export function StatsTickerBanner() {
  const [stats, setStats] = useState<DashboardTickerStats | null>(null);

  useEffect(() => {
    fetchDashboardTickerStats().then(setStats).catch(console.error);
    const interval = setInterval(() => {
      fetchDashboardTickerStats().then(setStats).catch(console.error);
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const tickerItems = [
    { icon: Building2, label: "Companies", value: stats.totalCompanies.toLocaleString(), color: "text-blue-400" },
    { icon: Users, label: "Total Users", value: stats.totalUsers.toLocaleString(), color: "text-emerald-400" },
    { icon: Database, label: "Price Records", value: (stats.priceRecords / 1000000).toFixed(1) + "M", color: "text-purple-400" },
    { icon: Newspaper, label: "News Articles", value: stats.newsArticles.toLocaleString(), color: "text-amber-400" },
    { icon: Eye, label: "Watchlists", value: stats.activeWatchlists.toLocaleString(), color: "text-cyan-400" },
    { icon: TrendingUp, label: "Data Status", value: "Live", color: "text-emerald-400" },
  ];

  return (
    <div className="w-full bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-b border-slate-700">
      <div className="relative overflow-hidden">
        <div className="animate-marquee-slow whitespace-nowrap py-2 px-4 flex items-center gap-6 text-xs">
          {[...tickerItems, ...tickerItems].map((item, idx) => {
            const Icon = item.icon;
            return (
              <span key={idx} className="inline-flex items-center gap-2 text-slate-300">
                <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                <span className="font-semibold">{item.label}:</span>
                <span className={`font-mono font-bold ${item.color}`}>{item.value}</span>
                {idx < tickerItems.length * 2 - 1 && <span className="text-slate-600 mx-2">|</span>}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
