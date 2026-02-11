"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { logAuthEvent } from "@/lib/api";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  ShieldX,
  LogOut,
  LogIn,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const REDIRECT_SECONDS = 10;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const accessDeniedLogged = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Log access_denied event once
  useEffect(() => {
    if (!loading && user && !isAdmin && !accessDeniedLogged.current) {
      accessDeniedLogged.current = true;
      logAuthEvent({
        userId: user.id,
        eventType: "access_denied",
        action: `Access denied for ${user.email} — not an admin`,
        metadata: { email: user.email },
      });
    }
  }, [loading, user, isAdmin]);

  // Countdown timer — auto sign-out + redirect after 10s
  useEffect(() => {
    if (loading || !user || isAdmin) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, user, isAdmin]);

  // When countdown hits 0, sign out and redirect
  useEffect(() => {
    if (countdown === 0 && user && !isAdmin) {
      signOut().then(() => router.push("/login"));
    }
  }, [countdown, user, isAdmin, signOut, router]);

  const handleSignOut = useCallback(async () => {
    logAuthEvent({
      userId: user?.id,
      eventType: "logout",
      action: `Admin portal logout for ${user?.email}`,
      metadata: { email: user?.email, trigger: "access_denied_screen" },
    });
    await signOut();
    router.push("/login");
  }, [user, signOut, router]);

  const handleLoginRedirect = useCallback(async () => {
    await signOut();
    router.push("/login");
  }, [signOut, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    const progress = ((REDIRECT_SECONDS - countdown) / REDIRECT_SECONDS) * 100;

    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-background px-4">
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-destructive/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-destructive/5 blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          <Card className="border-destructive/20 bg-card/90 shadow-xl backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-5 text-center">
                {/* Icon */}
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <ShieldX className="h-8 w-8 text-destructive" />
                </div>

                {/* Title */}
                <div>
                  <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This account doesn&apos;t have admin privileges.
                  </p>
                </div>

                {/* Collapsible details */}
                <div className="w-full">
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Details
                    {detailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {detailsOpen && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/50 p-4 text-left text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-mono">{user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">User ID</span>
                        <span className="font-mono">{user.id.slice(0, 12)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Admin Role</span>
                        <span className="font-medium text-destructive">Not assigned</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Action</span>
                        <span>Auto-redirect in {countdown}s</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Countdown progress */}
                <div className="w-full space-y-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-destructive/60 transition-all duration-1000 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Redirecting to login in <span className="font-bold tabular-nums">{countdown}</span> seconds
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex w-full gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleLoginRedirect}
                  >
                    <LogIn className="h-4 w-4" />
                    Login Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
            This event has been logged &middot; Contact your administrator for access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-background p-6">
        {children}
      </main>
    </div>
  );
}
