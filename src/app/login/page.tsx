"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";
import { logAuthEvent } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, Lock, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { user, loading: authLoading, signIn } = useAuth();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/overview");
    }
  }, [user, authLoading, router]);

  // Sync lockout state from sessionStorage
  useEffect(() => {
    const checkGate = () => {
      try {
        const raw = sessionStorage.getItem("_login_gate");
        if (!raw) { setLockoutSeconds(0); setFailedAttempts(0); return; }
        const gate = JSON.parse(raw);
        setFailedAttempts(gate.attempts ?? 0);
        if (gate.lockedUntil && Date.now() < gate.lockedUntil) {
          setLockoutSeconds(Math.ceil((gate.lockedUntil - Date.now()) / 1000));
        } else {
          setLockoutSeconds(0);
        }
      } catch { /* ignore */ }
    };
    checkGate();
    const interval = setInterval(checkGate, 1000);
    return () => clearInterval(interval);
  }, []);

  const logoSrc = mounted && resolvedTheme === "dark" ? "/logo-dark.svg" : "/logo.svg";
  const isLockedOut = lockoutSeconds > 0;

  const handleLogin = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLockedOut) return;
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
      logAuthEvent({
        eventType: "login_failed",
        action: `Failed login attempt for ${email}`,
        metadata: { email, error },
      });
      // Check if this triggered a lockout
      try {
        const raw = sessionStorage.getItem("_login_gate");
        if (raw) {
          const gate = JSON.parse(raw);
          if (gate.lockedUntil) {
            logAuthEvent({
              eventType: "brute_force_lockout",
              action: `Brute-force lockout triggered for ${email} after ${gate.attempts} attempts`,
              metadata: { email, attempts: gate.attempts },
            });
          }
        }
      } catch { /* ignore */ }
    } else {
      logAuthEvent({
        userId: null,
        eventType: "login_success",
        action: `Successful admin login for ${email}`,
        metadata: { email },
      });
      router.push("/overview");
    }
  }, [isLockedOut, signIn, email, password, router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Background grid + gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />

      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo + Badge */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="rounded-2xl border border-border/50 bg-card/80 p-3 shadow-lg backdrop-blur-sm">
            <Image
              src={logoSrc}
              alt="MarketView360"
              width={180}
              height={28}
              priority
            />
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            Admin Console
          </span>
        </div>

        <Card className="border-border/50 bg-card/80 shadow-xl backdrop-blur-sm">
          <CardContent className="p-6">
            {isLockedOut ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <ShieldAlert className="h-7 w-7 text-destructive" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-destructive">Temporarily Locked</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Too many failed attempts
                  </p>
                </div>
                <div className="rounded-xl bg-destructive/5 px-6 py-3">
                  <p className="text-3xl font-bold tabular-nums text-destructive">
                    {Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, "0")}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Please wait before trying again</p>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sign in to your admin account
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@marketview360.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  <Button type="submit" className="h-11 w-full gap-2 text-sm font-medium" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Authenticating...</>
                    ) : (
                      <><Lock className="h-4 w-4" /> Sign In <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </form>

                {error && (
                  <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  </div>
                )}

                {failedAttempts > 0 && failedAttempts < 5 && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    {5 - failedAttempts} attempt{5 - failedAttempts !== 1 ? "s" : ""} remaining before lockout
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
          Protected by brute-force detection &middot; All attempts are logged
        </p>
      </div>
    </div>
  );
}
