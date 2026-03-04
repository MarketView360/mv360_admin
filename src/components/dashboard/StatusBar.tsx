"use client";

import { useEffect, useState } from "react";
import {
    Clock,
    Globe,
    TrendingUp,
    Building2,
    Users,
    Database,
    Newspaper,
    Eye,
    Activity,
} from "lucide-react";
import { getMarketStatus, formatTimeRemaining } from "@/lib/market";
import { fetchDashboardTickerStats, fetchLastSyncInfo, type DashboardTickerStats, type LastSyncInfo } from "@/lib/api";
import { MarketDetailsDialog } from "./MarketDetailsDialog";
import { StatsTickerDialog } from "./StatsTickerDialog";

// Separator between items
function Sep() {
    return <span className="text-slate-600 dark:text-slate-600 select-none">|</span>;
}

export function StatusBar() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [stats, setStats] = useState<DashboardTickerStats | null>(null);
    const [syncInfo, setSyncInfo] = useState<LastSyncInfo | null>(null);
    const [marketDialogOpen, setMarketDialogOpen] = useState(false);
    const [statsDialogOpen, setStatsDialogOpen] = useState(false);

    // Tick every second for live clocks
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch stats every 2 minutes
    useEffect(() => {
        const load = async () => {
            try {
                const [s, sy] = await Promise.all([fetchDashboardTickerStats(), fetchLastSyncInfo()]);
                setStats(s);
                setSyncInfo(sy);
            } catch { }
        };
        load();
        const interval = setInterval(load, 120_000);
        return () => clearInterval(interval);
    }, []);

    const marketStatus = getMarketStatus(currentTime);

    const etTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const utcTime = new Date(currentTime.toISOString());
    const istTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    const fmt = (date: Date, zone: string) =>
        date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) +
        " " +
        date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " " +
        zone;

    const lastSyncDisplay = syncInfo?.lastSyncTime
        ? new Date(syncInfo.lastSyncTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "Pending";

    const marketOpen = marketStatus.isOpen;
    const marketLabel = marketOpen
        ? `Market OPEN`
        : `Market CLOSED${marketStatus.reason ? ` (${marketStatus.reason})` : ""}`;

    return (
        <>
            <div className="w-full bg-[#0a0b0f] border-b border-slate-800 text-[11px] font-mono text-slate-400 select-none flex flex-col">

                {/* ── Top Strip: Static Times & Market Status ── */}
                <div className="flex items-center justify-center gap-3 px-4 py-[6px] border-b border-slate-800/50 min-w-max bg-[#0f1117]">
                    <button
                        onClick={() => setMarketDialogOpen(true)}
                        className="flex items-center gap-3 hover:text-slate-200 transition-colors group"
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <Globe className="h-3 w-3 text-slate-500 group-hover:text-slate-300" />
                            ET: <span className="text-slate-300">{fmt(etTime, "ET")}</span>
                        </span>
                        <Sep />
                        <span className="inline-flex items-center gap-1.5">
                            <Globe className="h-3 w-3 text-slate-500 group-hover:text-slate-300" />
                            UTC: <span className="text-slate-300">{fmt(utcTime, "UTC")}</span>
                        </span>
                        <Sep />
                        <span className="inline-flex items-center gap-1.5">
                            <Globe className="h-3 w-3 text-slate-500 group-hover:text-slate-300" />
                            IST: <span className="text-slate-300">{fmt(istTime, "IST")}</span>
                        </span>
                    </button>

                    <Sep />

                    <button
                        onClick={() => setMarketDialogOpen(true)}
                        className={`inline-flex items-center gap-1.5 font-semibold transition-colors hover:brightness-125 ${marketOpen ? "text-emerald-400" : "text-amber-400"
                            }`}
                    >
                        <TrendingUp className="h-3 w-3" />
                        {marketLabel}
                        {marketOpen && marketStatus.nextClose && (
                            <span className="text-slate-500 font-normal ml-1">
                                · closes in {formatTimeRemaining(marketStatus.nextClose)}
                            </span>
                        )}
                        {!marketOpen && marketStatus.nextOpen && (
                            <span className="text-slate-500 font-normal ml-1">
                                · opens in {formatTimeRemaining(marketStatus.nextOpen)}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Bottom Strip: Live Stats Marquee ── */}
                <div className="relative w-full overflow-hidden flex items-center bg-[#0a0b0f] py-[6px]">
                    {stats ? (
                        <button
                            onClick={() => setStatsDialogOpen(true)}
                            className="flex items-center gap-3 hover:text-slate-200 transition-colors cursor-pointer w-full group animate-marquee whitespace-nowrap px-4"
                        >
                            {[0, 1].map((idx) => (
                                <span key={idx} className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Activity className="h-3 w-3 text-slate-500 group-hover:text-slate-400" />
                                        Last Sync: <span className={syncInfo?.lastSyncTime ? "text-emerald-400" : "text-amber-400"}>{lastSyncDisplay}</span>
                                    </span>
                                    <Sep />
                                    <span className="inline-flex items-center gap-1.5">
                                        <TrendingUp className="h-3 w-3 text-slate-500 group-hover:text-slate-400" />
                                        Data Status: <span className="text-emerald-400">Live</span>
                                    </span>
                                    <Sep />
                                    <span className="inline-flex items-center gap-1.5">
                                        <Building2 className="h-3 w-3 text-slate-500 group-hover:text-slate-400" />
                                        Companies: <span className="text-blue-400">{stats.totalCompanies.toLocaleString()}</span>
                                    </span>
                                    <Sep />
                                    <span className="inline-flex items-center gap-1.5">
                                        <Users className="h-3 w-3 text-slate-500 group-hover:text-slate-400" />
                                        Total Users: <span className="text-emerald-400">{stats.totalUsers.toLocaleString()}</span>
                                    </span>
                                    <Sep />
                                    <span className="inline-flex items-center gap-1.5">
                                        <Database className="h-3 w-3 text-slate-500 group-hover:text-slate-400" />
                                        Price Records: <span className="text-purple-400">{(stats.priceRecords / 1_000_000).toFixed(1)}M</span>
                                    </span>
                                    <Sep />
                                    <span className="inline-flex items-center gap-1.5">
                                        <Newspaper className="h-3 w-3 text-slate-500 group-hover:text-slate-400" />
                                        News Articles: <span className="text-amber-400">{stats.newsArticles.toLocaleString()}</span>
                                    </span>
                                    <Sep />
                                    <span className="inline-flex items-center gap-1.5">
                                        <Eye className="h-3 w-3 text-slate-500 group-hover:text-slate-400" />
                                        Watchlists: <span className="text-cyan-400">{stats.activeWatchlists.toLocaleString()}</span>
                                    </span>
                                    <Sep />
                                </span>
                            ))}
                        </button>
                    ) : (
                        <div className="w-full px-4 text-center">
                            <span className="text-slate-600">Loading stats…</span>
                        </div>
                    )}
                </div>
            </div>

            <MarketDetailsDialog
                open={marketDialogOpen}
                onOpenChange={setMarketDialogOpen}
                marketStatus={marketStatus}
                currentTime={currentTime}
            />
            {stats && (
                <StatsTickerDialog
                    open={statsDialogOpen}
                    onOpenChange={setStatsDialogOpen}
                    stats={stats}
                    syncInfo={syncInfo}
                />
            )}
        </>
    );
}
