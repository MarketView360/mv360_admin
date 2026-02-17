"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Crown, Shield, Search, Edit, Trash2, RefreshCw, TrendingUp, Activity, AlertTriangle, ChevronDown, ChevronRight, DollarSign, Mail, Bell, Calendar, UserX, Ban } from "lucide-react";
import { fetchUsers, updateUserProfile, toggleTempSuspend, togglePermSuspend, deleteUserAccount } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface UserProfile {
  id: string;
  created_at: string;
  updated_at: string | null;
  full_name: string | null;
  email: string | null;
  display_name: string | null;
  subscription_tier: string | null;
  role: string | null;
  billing_customer_id: string | null;
  newsletter_opt_in: boolean;
  announcements_opt_in: boolean;
  alerts_opt_in: boolean;
  events_and_promotions_opt_in: boolean;
  temp_suspend: boolean | null;
  perm_suspend: boolean | null;
  metadata: any;
  preferences: any;
  settings: {
    theme?: string;
    desktop_notifications?: boolean;
    email_notifications?: boolean;
  } | null;
  screenCount: number;
  watchlistCount: number;
  lastActivity: string | null;
}

const TIER_PRICES = { free: 0, premium: 19.99, max: 49.99 };
const TIER_COLORS = { free: "#94a3b8", premium: "#3b82f6", max: "#8b5cf6" };

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [suspendFilter, setSuspendFilter] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [compactMode, setCompactMode] = useState(true);
  
  const [editDialog, setEditDialog] = useState<{ open: boolean; user?: UserProfile }>({ open: false });
  const [editForm, setEditForm] = useState({
    subscription_tier: "",
    role: "",
    full_name: "",
    newsletter_opt_in: false,
    announcements_opt_in: false,
    alerts_opt_in: false,
    events_and_promotions_opt_in: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = users;
    
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.includes(searchQuery)
      );
    }

    if (tierFilter !== "all") {
      filtered = filtered.filter(u => (u.subscription_tier || "free") === tierFilter);
    }

    if (activityFilter === "active") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      filtered = filtered.filter(u => u.lastActivity && u.lastActivity > thirtyDaysAgo);
    } else if (activityFilter === "inactive") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      filtered = filtered.filter(u => !u.lastActivity || u.lastActivity <= thirtyDaysAgo);
    }

    if (suspendFilter === "suspended") {
      filtered = filtered.filter(u => u.temp_suspend || u.perm_suspend);
    } else if (suspendFilter === "active") {
      filtered = filtered.filter(u => !u.temp_suspend && !u.perm_suspend);
    }

    setFilteredUsers(filtered);
  }, [searchQuery, tierFilter, activityFilter, suspendFilter, users]);

  const openEditDialog = (user: UserProfile) => {
    setEditForm({
      subscription_tier: user.subscription_tier || "free",
      role: user.role || "user",
      full_name: user.full_name || "",
      newsletter_opt_in: user.newsletter_opt_in,
      announcements_opt_in: user.announcements_opt_in,
      alerts_opt_in: user.alerts_opt_in,
      events_and_promotions_opt_in: user.events_and_promotions_opt_in,
    });
    setEditDialog({ open: true, user });
  };

  const handleSaveUser = async () => {
    if (!editDialog.user) return;
    try {
      await updateUserProfile(editDialog.user.id, editForm);
      await loadData();
      setEditDialog({ open: false });
    } catch (err) {
      console.error("Failed to update user:", err);
      alert("Failed to update user");
    }
  };

  const handleToggleTempSuspend = async (userId: string, suspend: boolean) => {
    try {
      await toggleTempSuspend(userId, suspend);
      await loadData();
    } catch (err) {
      console.error("Failed to toggle suspension:", err);
    }
  };

  const handleTogglePermSuspend = async (userId: string, suspend: boolean) => {
    if (!confirm(`${suspend ? "PERMANENTLY suspend" : "Remove permanent suspension from"} this user?`)) return;
    try {
      await togglePermSuspend(userId, suspend);
      await loadData();
    } catch (err) {
      console.error("Failed to toggle permanent suspension:", err);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("PERMANENTLY delete this user account? This cannot be undone!")) return;
    try {
      await deleteUserAccount(userId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("Failed to delete user");
    }
  };

  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const getTierStats = () => {
    const free = users.filter(u => !u.subscription_tier || u.subscription_tier === "free").length;
    const premium = users.filter(u => u.subscription_tier === "premium").length;
    const max = users.filter(u => u.subscription_tier === "max").length;
    return { free, premium, max };
  };

  const getActivityStats = () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activeUsers = users.filter(u => u.lastActivity && u.lastActivity > thirtyDaysAgo).length;
    const withPayment = users.filter(u => u.billing_customer_id).length;
    const suspended = users.filter(u => u.temp_suspend || u.perm_suspend).length;
    return { activeUsers, withPayment, suspended };
  };

  const getUserGrowth = () => {
    const now = Date.now();
    const lastWeek = users.filter(u => new Date(u.created_at).getTime() > now - 7 * 86400000).length;
    const lastMonth = users.filter(u => new Date(u.created_at).getTime() > now - 30 * 86400000).length;
    return { lastWeek, lastMonth };
  };

  const getSubscriptionDuration = (createdAt: string, tier: string) => {
    if (tier === "free") return "N/A";
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""}`;
  };

  const getLastActivityText = (lastActivity: string | null) => {
    if (!lastActivity) return "Never";
    const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const tierStats = getTierStats();
  const activityStats = getActivityStats();
  const growthStats = getUserGrowth();

  const tierData = [
    { name: "Free", value: tierStats.free, color: TIER_COLORS.free },
    { name: "Premium", value: tierStats.premium, color: TIER_COLORS.premium },
    { name: "Max", value: tierStats.max, color: TIER_COLORS.max },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Advanced user management, subscriptions, and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCompactMode(!compactMode)}>
            {compactMode ? "Expanded View" : "Compact View"}
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">+{growthStats.lastWeek} this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active (30d)</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {users.length > 0 ? Math.round((activityStats.activeUsers / users.length) * 100) : 0}% activity rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paying Users</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tierStats.premium + tierStats.max}</div>
            <p className="text-xs text-muted-foreground">
              ${((tierStats.premium * TIER_PRICES.premium) + (tierStats.max * TIER_PRICES.max)).toFixed(0)}/mo MRR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.length > 0 ? Math.round(((tierStats.premium + tierStats.max) / users.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Free to paid</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
            <CardDescription>User breakdown by tier</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {tierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
            <CardDescription>Important user statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">With Billing</span>
              <Badge>{activityStats.withPayment} users</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Suspended</span>
              <Badge variant="destructive">{activityStats.suspended} users</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">New This Month</span>
              <Badge variant="outline">{growthStats.lastMonth} users</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Max Tier Users</span>
              <Badge className="bg-purple-500">{tierStats.max} users</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Database</CardTitle>
          <CardDescription>Advanced filtering and user management</CardDescription>
          <div className="grid gap-4 md:grid-cols-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="max">Max</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="active">Active (30d)</SelectItem>
                <SelectItem value="inactive">Inactive (30d+)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={suspendFilter} onValueChange={setSuspendFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Tier</TableHead>
                  {!compactMode && <TableHead>Payment</TableHead>}
                  {!compactMode && <TableHead>Duration</TableHead>}
                  <TableHead>Last Active</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <>
                    <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={() => toggleRow(user.id)}>
                        {expandedRows.has(user.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name || user.display_name || "Anonymous"}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={(user.subscription_tier || "free") === "max" ? "default" : (user.subscription_tier === "premium" ? "secondary" : "outline")}
                          className={(user.subscription_tier || "free") === "max" ? "bg-purple-500" : ""}
                        >
                          {(user.subscription_tier || "free").toUpperCase()}
                        </Badge>
                      </TableCell>
                      {!compactMode && (
                        <TableCell>
                          {(user.subscription_tier && user.subscription_tier !== "free") ? (
                            <span className="text-sm font-medium">
                              ${TIER_PRICES[user.subscription_tier as keyof typeof TIER_PRICES]}/mo
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      {!compactMode && (
                        <TableCell>
                          <span className="text-sm">{getSubscriptionDuration(user.created_at, user.subscription_tier || "free")}</span>
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="text-sm">{getLastActivityText(user.lastActivity)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.role === "admin" && <Badge className="bg-red-500 text-xs"><Shield className="h-3 w-3" /></Badge>}
                          {user.perm_suspend && <Badge variant="destructive" className="text-xs"><Ban className="h-3 w-3" /></Badge>}
                          {user.temp_suspend && <Badge variant="outline" className="text-xs"><UserX className="h-3 w-3" /></Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(user.id) && (
                      <TableRow key={`${user.id}-expanded`}>
                        <TableCell colSpan={compactMode ? 6 : 8} className="bg-muted/30">
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="font-semibold text-xs text-muted-foreground mb-1">User ID</div>
                                <code className="text-xs bg-muted px-2 py-1 rounded">{user.id.slice(0, 8)}...</code>
                              </div>
                              <div>
                                <div className="font-semibold text-xs text-muted-foreground mb-1">Joined</div>
                                <div>{new Date(user.created_at).toLocaleDateString()}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-xs text-muted-foreground mb-1">Activity</div>
                                <div>📊 {user.screenCount} screens • ⭐ {user.watchlistCount} watchlists</div>
                              </div>
                              <div>
                                <div className="font-semibold text-xs text-muted-foreground mb-1">Billing ID</div>
                                <div className="text-xs">{user.billing_customer_id || "None"}</div>
                              </div>
                            </div>

                            <div className="border-t pt-3">
                              <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Communication Preferences
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${user.newsletter_opt_in ? "bg-green-500" : "bg-gray-300"}`} />
                                  <span className="text-sm">Newsletter</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${user.announcements_opt_in ? "bg-green-500" : "bg-gray-300"}`} />
                                  <span className="text-sm">Announcements</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${user.alerts_opt_in ? "bg-green-500" : "bg-gray-300"}`} />
                                  <span className="text-sm">Alerts</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${user.events_and_promotions_opt_in ? "bg-green-500" : "bg-gray-300"}`} />
                                  <span className="text-sm">Events & Promos</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 border-t pt-3">
                              {!user.temp_suspend && !user.perm_suspend && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleToggleTempSuspend(user.id, true)}>
                                    <UserX className="h-3 w-3 mr-1" />
                                    Temp Suspend
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => handleTogglePermSuspend(user.id, true)}>
                                    <Ban className="h-3 w-3 mr-1" />
                                    Perm Suspend
                                  </Button>
                                </>
                              )}
                              {user.temp_suspend && (
                                <Button variant="outline" size="sm" onClick={() => handleToggleTempSuspend(user.id, false)}>
                                  Lift Temp Suspension
                                </Button>
                              )}
                              {user.perm_suspend && (
                                <Button variant="destructive" size="sm" onClick={() => handleTogglePermSuspend(user.id, false)}>
                                  Lift Perm Suspension
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No users found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editDialog.user?.full_name || editDialog.user?.email}</DialogTitle>
            <DialogDescription>Update user subscription, role, and communication preferences</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="User's full name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Subscription Tier</Label>
              <Select value={editForm.subscription_tier} onValueChange={(value) => setEditForm({ ...editForm, subscription_tier: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium ($19.99/mo)</SelectItem>
                  <SelectItem value="max">Max ($49.99/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-semibold">Communication Preferences</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="newsletter" className="text-sm font-normal">Newsletter</Label>
                <Switch
                  id="newsletter"
                  checked={editForm.newsletter_opt_in}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, newsletter_opt_in: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="announcements" className="text-sm font-normal">Announcements</Label>
                <Switch
                  id="announcements"
                  checked={editForm.announcements_opt_in}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, announcements_opt_in: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="alerts" className="text-sm font-normal">Alerts</Label>
                <Switch
                  id="alerts"
                  checked={editForm.alerts_opt_in}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, alerts_opt_in: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="events" className="text-sm font-normal">Events & Promotions</Label>
                <Switch
                  id="events"
                  checked={editForm.events_and_promotions_opt_in}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, events_and_promotions_opt_in: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false })}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
