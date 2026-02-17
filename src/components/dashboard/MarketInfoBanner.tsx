"use client";

import { useEffect, useState } from "react";
import { Clock, TrendingUp, Globe } from "lucide-react";
import { getMarketStatus, formatTimeRemaining } from "@/lib/market";
import { MarketDetailsDialog } from "./MarketDetailsDialog";

export function MarketInfoBanner() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const marketStatus = getMarketStatus(currentTime);

  const estTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const pstTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const gmtTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "GMT" }));
  const utcTime = new Date(currentTime.toISOString());

  const formatTime = (date: Date, zone: string) => {
    return date.toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: true 
    }) + " " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + zone;
  };

  const marketStatusText = marketStatus.isOpen 
    ? `Market OPEN • Closes ${marketStatus.nextClose ? `in ${formatTimeRemaining(marketStatus.nextClose)}` : "at 4:00 PM EST"}`
    : `Market CLOSED${marketStatus.reason ? ` (${marketStatus.reason})` : ""} • Opens ${marketStatus.nextOpen ? formatTimeRemaining(marketStatus.nextOpen) : "Tomorrow"}`;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 transition-all cursor-pointer group"
      >
        <div className="relative overflow-hidden">
          <div className="animate-marquee whitespace-nowrap py-2 px-4 flex items-center gap-8 text-sm">
            <span className="inline-flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
              <Clock className="h-4 w-4" />
              <span className="font-semibold">EST:</span> {formatTime(estTime, "EST")}
            </span>
            <span className="text-slate-400">•</span>
            <span className="inline-flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
              <Globe className="h-4 w-4" />
              <span className="font-semibold">PST:</span> {formatTime(pstTime, "PST")}
            </span>
            <span className="text-slate-400">•</span>
            <span className="inline-flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
              <Globe className="h-4 w-4" />
              <span className="font-semibold">GMT:</span> {formatTime(gmtTime, "GMT")}
            </span>
            <span className="text-slate-400">•</span>
            <span className="inline-flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
              <Globe className="h-4 w-4" />
              <span className="font-semibold">UTC:</span> {formatTime(utcTime, "UTC")}
            </span>
            <span className="text-slate-400">•</span>
            <span className={`inline-flex items-center gap-2 font-semibold ${marketStatus.isOpen ? "text-emerald-400" : "text-amber-400"} group-hover:text-white transition-colors`}>
              <TrendingUp className="h-4 w-4" />
              {marketStatusText}
            </span>
          </div>
        </div>
      </button>

      <MarketDetailsDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        marketStatus={marketStatus}
        currentTime={currentTime}
      />
    </>
  );
}
