"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  UserCheck,
  Crown,
  Eye,
  LayoutGrid,
  Bell,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Palette,
} from "lucide-react";
import { fetchUsers } from "@/lib/api";

interface UserSettings {
  user_id: string;
  theme: string | null;
  text_size: string | null;
  compact_mode: boolean | null;
  reduce_animations: boolean | null;
  desktop_notifications: boolean | null;
  email_notifications: boolean | null;
  use_custom_ai_keys: boolean | null;
}

interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  subscription_tier: string | null;
  role: string | null;
  created_at: string;
  updated_at: string | null;
  onboarded_at: string | null;
  billing_customer_id: string | null;
  newsletter_opt_in: boolean;
  announcements_opt_in: boolean;
  alerts_opt_in: boolean;
  settings: UserSettings | null;
  screenCount: number;
  watchlistCount: number;
}

const TIER_STYLE: Record<string, string> = {
  free: "border-muted-foreground/30",
  premium: "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  pro: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data as UserProfile[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      !search ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const recentCount = users.filter(
    (u) => new Date(u.created_at).getTime() > Date.now() - 7 * 86400000
  ).length;

  const totalWatchlists = users.reduce((s, u) => s + u.watchlistCount, 0);
  const totalScreens = users.reduce((s, u) => s + u.screenCount, 0);

  const S = () => <Skeleton className="h-8 w-12" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Advanced user management with settings, screens & watchlists
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>{loading ? <S /> : <div className="text-2xl font-bold">{users.length}</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New (7d)</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>{loading ? <S /> : <div className="text-2xl font-bold">{recentCount}</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>{loading ? <S /> : <div className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Premium/Pro</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>{loading ? <S /> : <div className="text-2xl font-bold">{users.filter((u) => u.subscription_tier === "premium" || u.subscription_tier === "pro").length}</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Watchlists</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>{loading ? <S /> : <div className="text-2xl font-bold">{totalWatchlists}</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Screens</CardTitle>
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>{loading ? <S /> : <div className="text-2xl font-bold">{totalScreens}</div>}</CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by email, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {filtered.length} of {users.length} users &middot; Click a row for details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? "No users match your search." : "No users found."}
            </p>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Watchlists</TableHead>
                    <TableHead className="text-center">Screens</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => {
                    const initials = (user.display_name || user.full_name || user.email || "?")
                      .split(/[@.\s]/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0]?.toUpperCase())
                      .join("");
                    const isExpanded = expandedUser === user.id;

                    return (
                      <>
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                        >
                          <TableCell className="w-8 pr-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{user.display_name || user.full_name || "—"}</p>
                                <p className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{user.email ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize text-xs ${TIER_STYLE[user.subscription_tier || "free"] ?? ""}`}>
                              {user.subscription_tier || "free"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.role === "admin" ? (
                              <Badge className="bg-amber-600/20 text-amber-700 dark:text-amber-400 border-0 text-xs">Admin</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">User</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm">{user.watchlistCount}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm">{user.screenCount}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <TableRow key={`${user.id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={8} className="p-4">
                              <div className="grid gap-4 md:grid-cols-3">
                                {/* Profile Details */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</p>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Full Name</span><span>{user.full_name || "—"}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Display Name</span><span>{user.display_name || "—"}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Billing ID</span><span className="font-mono text-xs">{user.billing_customer_id || "—"}</span></div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Onboarded</span>
                                      {user.onboarded_at ? (
                                        <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3 w-3" /> {new Date(user.onboarded_at).toLocaleDateString()}</span>
                                      ) : (
                                        <span className="text-amber-500 text-xs">Not yet</span>
                                      )}
                                    </div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Last Updated</span><span className="text-xs">{user.updated_at ? new Date(user.updated_at).toLocaleString() : "—"}</span></div>
                                  </div>
                                </div>

                                {/* Notification Prefs */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Bell className="h-3 w-3" /> Notifications</p>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Newsletter</span>{user.newsletter_opt_in ? <Badge className="bg-emerald-600/20 text-emerald-600 border-0 text-xs">On</Badge> : <span className="text-xs text-muted-foreground">Off</span>}</div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Announcements</span>{user.announcements_opt_in ? <Badge className="bg-emerald-600/20 text-emerald-600 border-0 text-xs">On</Badge> : <span className="text-xs text-muted-foreground">Off</span>}</div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Price Alerts</span>{user.alerts_opt_in ? <Badge className="bg-emerald-600/20 text-emerald-600 border-0 text-xs">On</Badge> : <span className="text-xs text-muted-foreground">Off</span>}</div>
                                  </div>
                                </div>

                                {/* App Settings */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Palette className="h-3 w-3" /> App Settings</p>
                                  {user.settings ? (
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between"><span className="text-muted-foreground">Theme</span><span className="capitalize">{user.settings.theme || "system"}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Text Size</span><span className="capitalize">{user.settings.text_size || "medium"}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Compact Mode</span><span>{user.settings.compact_mode ? "Yes" : "No"}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Custom AI Keys</span><span>{user.settings.use_custom_ai_keys ? "Yes" : "No"}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Desktop Notifs</span><span>{user.settings.desktop_notifications ? "On" : "Off"}</span></div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No custom settings configured</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
