"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Crown, Shield, Search, Edit, Trash2, UserX, RefreshCw, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import { fetchUsers, updateUserProfile, suspendUser, deleteUserAccount } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface UserProfile {
  id: string;
  created_at: string;
  full_name: string | null;
  subscription_tier: string | null;
  role: string | null;
  billing_customer_id: string | null;
  settings: {
    notification_enabled?: boolean;
    theme?: string;
    onboarding_completed?: boolean;
  } | null;
  screenCount: number;
  watchlistCount: number;
}

const TIER_COLORS = {
  free: "#94a3b8",
  premium: "#3b82f6",
  elite: "#8b5cf6",
};

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [editDialog, setEditDialog] = useState<{ open: boolean; user?: UserProfile }>({ open: false });
  const [editForm, setEditForm] = useState({ subscription_tier: "", role: "", full_name: "" });

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
        u.id.includes(searchQuery)
      );
    }

    if (tierFilter !== "all") {
      filtered = filtered.filter(u => (u.subscription_tier || "free") === tierFilter);
    }

    setFilteredUsers(filtered);
  }, [searchQuery, tierFilter, users]);

  const openEditDialog = (user: UserProfile) => {
    setEditForm({
      subscription_tier: user.subscription_tier || "free",
      role: user.role || "user",
      full_name: user.full_name || "",
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

  const handleSuspend = async (userId: string) => {
    if (!confirm("Suspend this user?")) return;
    try {
      await suspendUser(userId);
      await loadData();
    } catch (err) {
      console.error("Failed to suspend user:", err);
      alert("Failed to suspend user");
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

  const getTierStats = () => {
    const free = users.filter(u => !u.subscription_tier || u.subscription_tier === "free").length;
    const premium = users.filter(u => u.subscription_tier === "premium").length;
    const elite = users.filter(u => u.subscription_tier === "elite").length;
    return { free, premium, elite };
  };

  const getActivityStats = () => {
    const activeUsers = users.filter(u => (u.screenCount + u.watchlistCount) > 0).length;
    const onboardingCompleted = users.filter(u => u.settings?.onboarding_completed).length;
    const withNotifications = users.filter(u => u.settings?.notification_enabled).length;
    return { activeUsers, onboardingCompleted, withNotifications };
  };

  const getUserGrowth = () => {
    const now = Date.now();
    const lastWeek = users.filter(u => new Date(u.created_at).getTime() > now - 7 * 86400000).length;
    const lastMonth = users.filter(u => new Date(u.created_at).getTime() > now - 30 * 86400000).length;
    return { lastWeek, lastMonth };
  };

  const tierStats = getTierStats();
  const activityStats = getActivityStats();
  const growthStats = getUserGrowth();

  const tierData = [
    { name: "Free", value: tierStats.free, color: TIER_COLORS.free },
    { name: "Premium", value: tierStats.premium, color: TIER_COLORS.premium },
    { name: "Elite", value: tierStats.elite, color: TIER_COLORS.elite },
  ];

  const activityData = [
    { name: "Total Users", count: users.length },
    { name: "Active Users", count: activityStats.activeUsers },
    { name: "Completed Onboarding", count: activityStats.onboardingCompleted },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-3">
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
          <p className="text-muted-foreground">Manage users, subscriptions, and permissions</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              +{growthStats.lastWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Elite Tier</CardTitle>
            <Crown className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tierStats.elite}</div>
            <p className="text-xs text-muted-foreground">
              {users.length > 0 ? Math.round((tierStats.elite / users.length) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {users.length > 0 ? Math.round((activityStats.activeUsers / users.length) * 100) : 0}% active
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
              {users.length > 0 ? Math.round(((tierStats.premium + tierStats.elite) / users.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Free to paid</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Tier Distribution</CardTitle>
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
            <CardTitle>User Activity Overview</CardTitle>
            <CardDescription>Engagement metrics</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Database</CardTitle>
          <CardDescription>Search, filter, and manage user accounts</CardDescription>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{user.full_name || "Anonymous User"}</h3>
                        <Badge variant={user.subscription_tier === "elite" ? "default" : user.subscription_tier === "premium" ? "secondary" : "outline"}>
                          {(user.subscription_tier || "free").toUpperCase()}
                        </Badge>
                        {user.role === "admin" && <Badge className="bg-red-500"><Shield className="h-3 w-3 mr-1" />Admin</Badge>}
                        {user.role === "suspended" && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Suspended</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{user.id}</code></div>
                        <div>Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                        <div className="flex gap-4">
                          <span>📊 {user.screenCount} screens</span>
                          <span>⭐ {user.watchlistCount} watchlists</span>
                          <span>{user.settings?.onboarding_completed ? "✅ Onboarded" : "❌ Not onboarded"}</span>
                          <span>{user.settings?.notification_enabled ? "🔔 Notifications ON" : "🔕 Notifications OFF"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {user.role !== "suspended" && (
                        <Button variant="outline" size="sm" onClick={() => handleSuspend(user.id)}>
                          <UserX className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No users found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editDialog.user?.full_name || "Anonymous"}</DialogTitle>
            <DialogDescription>Update user subscription, role, and profile information</DialogDescription>
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
                  <SelectItem value="elite">Elite ($49.99/mo)</SelectItem>
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
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
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
