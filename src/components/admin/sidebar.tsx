"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { logAuthEvent } from "@/lib/api";
import {
  LayoutDashboard,
  Cpu,
  BarChart3,
  ScrollText,
  DollarSign,
  Users,
  DatabaseZap,
  FileText,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/genesis", label: "Genesis Engine", icon: Cpu },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/logging", label: "Logging", icon: ScrollText },
  { href: "/revenue", label: "Revenue", icon: DollarSign },
  { href: "/users", label: "Users", icon: Users },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/data-quality", label: "Data Quality", icon: DatabaseZap },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    logAuthEvent({
      userId: user?.id,
      eventType: "logout",
      action: `Admin portal logout for ${user?.email}`,
      metadata: { email: user?.email, trigger: "sidebar" },
    });
    await signOut();
    router.push("/login");
  };

  const logoSrc = mounted && resolvedTheme === "dark" ? "/logo-dark.svg" : "/logo.svg";

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/overview" className="flex items-center gap-2">
          <Image
            src={logoSrc}
            alt="MarketView360"
            width={160}
            height={24}
            priority
          />
        </Link>
        <ThemeToggle />
      </div>
      <div className="px-4 pb-2">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Admin
        </span>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="p-4">
        <div className="mb-3 truncate px-2 text-xs text-muted-foreground">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
