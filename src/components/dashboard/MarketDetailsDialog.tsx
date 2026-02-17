"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, Database, CheckCircle2, XCircle, Calendar } from "lucide-react";
import type { MarketStatus } from "@/lib/market";
import type { LastSyncInfo } from "@/lib/api";

interface MarketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketStatus: MarketStatus;
  syncInfo: LastSyncInfo | null;
  currentTime: Date;
}

export function MarketDetailsDialog({
  open,
  onOpenChange,
  marketStatus,
  syncInfo,
  currentTime,
}: MarketDetailsDialogProps) {
  const estTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const pstTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const gmtTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "GMT" }));
  const utcTime = new Date(currentTime.toISOString());

  const formatFullTime = (date: Date, zone: string) => {
    return {
      time: date.toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit",
        hour12: true 
      }),
      date: date.toLocaleDateString("en-US", { 
        weekday: "long",
        year: "numeric",
        month: "long", 
        day: "numeric" 
      }),
      zone,
    };
  };

  const times = [
    { ...formatFullTime(estTime, "EST"), emoji: "🇺🇸", label: "US East" },
    { ...formatFullTime(pstTime, "PST"), emoji: "🇺🇸", label: "US West" },
    { ...formatFullTime(gmtTime, "GMT"), emoji: "🌍", label: "Greenwich Mean Time" },
    { ...formatFullTime(utcTime, "UTC"), emoji: "🌐", label: "Coordinated Universal Time" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5" /> Market & System Status
          </DialogTitle>
          <DialogDescription>Real-time market hours and data pipeline status</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Market Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" /> US Stock Market Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Status</span>
                <Badge className={`${marketStatus.isOpen ? "bg-emerald-600/20 text-emerald-600" : "bg-slate-600/20 text-slate-400"} border-0`}>
                  {marketStatus.isOpen ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> OPEN</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" /> CLOSED</>
                  )}
                </Badge>
              </div>
              {marketStatus.reason && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reason</span>
                  <span className="text-sm font-medium">{marketStatus.reason}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trading Hours (EST)</span>
                <span className="text-sm font-medium">9:30 AM - 4:00 PM</span>
              </div>
              {marketStatus.nextOpen && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Next Opens</span>
                  <span className="text-sm font-medium">
                    {marketStatus.nextOpen.toLocaleString("en-US", { 
                      weekday: "short",
                      month: "short", 
                      day: "numeric", 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })} EST
                  </span>
                </div>
              )}
              {marketStatus.nextClose && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Closes Today</span>
                  <span className="text-sm font-medium">
                    {marketStatus.nextClose.toLocaleTimeString("en-US", { 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })} EST
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Zones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" /> Current Time (All Zones)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {times.map((t) => (
                <div key={t.zone} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <span>{t.emoji}</span> {t.label} ({t.zone})
                    </span>
                    <span className="text-sm font-mono font-semibold">{t.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Data Pipeline Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" /> Data Pipeline Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncInfo && syncInfo.lastSyncTime ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Last Sync</span>
                    <span className="text-sm font-semibold">
                      {new Date(syncInfo.lastSyncTime).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Syncs by Table</p>
                    {syncInfo.syncsByTable.slice(0, 8).map((table) => (
                      <div key={table.tableName} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-muted-foreground">{table.tableName}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${table.status === "completed" ? "border-emerald-500/40 text-emerald-600" : "border-slate-400"}`}>
                            {table.status}
                          </Badge>
                          <span className="text-muted-foreground">
                            {table.recordsProcessed?.toLocaleString() || 0} rec
                          </span>
                          <span className="text-muted-foreground">
                            {table.lastSync ? new Date(table.lastSync).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No sync data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
