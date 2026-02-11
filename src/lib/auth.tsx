"use client";

import { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

// ─── Brute-force protection ─────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

interface LoginGate {
  attempts: number;
  lockedUntil: number | null;
}

function getLoginGate(): LoginGate {
  if (typeof window === "undefined") return { attempts: 0, lockedUntil: null };
  try {
    const raw = sessionStorage.getItem("_login_gate");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { attempts: 0, lockedUntil: null };
}

function setLoginGate(gate: LoginGate) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("_login_gate", JSON.stringify(gate));
}

function resetLoginGate() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("_login_gate");
}

// ─── Session timeout ─────────────────────────────────────────────────────────

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour of inactivity

// ─── Auth context ────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function checkIsAdmin(user: User | null): boolean {
  if (!user) return false;
  // Check app_metadata (set via Supabase service role)
  const meta = user.app_metadata;
  if (meta?.role === "admin" || meta?.roles?.includes("admin")) return true;
  // Fallback: check against allowed admin emails from env var
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(0);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Session timeout: auto sign-out after inactivity ──────────────────────

  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer));

    const interval = setInterval(async () => {
      if (Date.now() - lastActivityRef.current > SESSION_TIMEOUT_MS) {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
      }
    }, 30_000); // check every 30s

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearInterval(interval);
    };
  }, [user]);

  // ── Sign in with brute-force protection ──────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const gate = getLoginGate();

    // Check if locked out
    if (gate.lockedUntil && Date.now() < gate.lockedUntil) {
      const secsLeft = Math.ceil((gate.lockedUntil - Date.now()) / 1000);
      return { error: `Too many failed attempts. Try again in ${secsLeft}s.` };
    }

    // Reset if lockout expired
    if (gate.lockedUntil && Date.now() >= gate.lockedUntil) {
      resetLoginGate();
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const updated = getLoginGate();
      updated.attempts += 1;
      if (updated.attempts >= MAX_ATTEMPTS) {
        updated.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      }
      setLoginGate(updated);
      return { error: error.message };
    }

    // Success — reset gate
    resetLoginGate();
    return { error: null };
  }, []);

  // ── Sign out — clear state immediately ───────────────────────────────────

  const signOut = useCallback(async () => {
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  }, []);

  const isAdmin = checkIsAdmin(user);

  const value = useMemo(
    () => ({ user, session, isAdmin, loading, signIn, signOut }),
    [user, session, isAdmin, loading, signIn, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
