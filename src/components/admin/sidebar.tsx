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
  Activity,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/genesis", label: "Genesis Engine", icon: Cpu },
  { href: "/tickers", label: "Tickers", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/logging", label: "Logging", icon: ScrollText },
  { href: "/revenue", label: "Revenue", icon: DollarSign },
  { href: "/users", label: "Users", icon: Users },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/data-quality", label: "Data Quality", icon: DatabaseZap },
];

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AdminSidebar({ collapsed = false, onToggle }: AdminSidebarProps) {
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

  // Sidebar content component
  const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-4",
        isCollapsed && "justify-center px-2"
      )}>
        <Link href="/overview" className="flex items-center gap-2">
          <Image
            src={logoSrc}
            alt="MarketView360"
            width={isCollapsed ? 32 : 140}
            height={24}
            priority
            className={cn("transition-all", isCollapsed && "h-8 w-8")}
          />
        </Link>
        {!isCollapsed && <ThemeToggle />}
      </div>

      {/* Admin badge */}
      {!isCollapsed && (
        <div className="px-4 pb-2">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Admin
          </span>
        </div>
      )}

      <Separator />

      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-1 px-3 py-4",
        isCollapsed && "px-2"
      )}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          const navItem = (
            <div
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isCollapsed && "justify-center px-2"
              )}
              onClick={() => router.push(item.href)}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </div>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return navItem;
        })}
      </nav>

      <Separator />

      {/* User section */}
      <div className={cn("p-4", isCollapsed && "px-2")}>
        {!isCollapsed ? (
          <>
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
          </>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign Out</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent isCollapsed={collapsed} />
    </aside>
  );
}

// Collapsible wrapper component that manages the collapse state
export function CollapsibleAdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Toggle collapse on button click
  const handleToggle = () => setIsCollapsed(prev => !prev);

  // Temporarily expand on hover when collapsed
  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  // Effective collapsed state (collapsed unless hovering)
  const effectiveCollapsed = isCollapsed && !isHovering;

  return (
    <div
      className="relative flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AdminSidebar collapsed={effectiveCollapsed} onToggle={handleToggle} />

      {/* Collapse toggle button - always visible when not hovering on collapsed sidebar */}
      <button
        onClick={(e) => { e.stopPropagation(); handleToggle(); }}
        className={cn(
          "absolute -right-3 top-8 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-md transition-all hover:bg-accent",
          isCollapsed ? "" : ""
        )}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        onMouseEnter={(e) => e.stopPropagation()}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
