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
import { Clock, TrendingUp, CheckCircle2, XCircle, Calendar } from "lucide-react";
import type { MarketStatus } from "@/lib/market";

interface MarketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketStatus: MarketStatus;
  currentTime: Date;
}

export function MarketDetailsDialog({
  open,
  onOpenChange,
  marketStatus,
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
