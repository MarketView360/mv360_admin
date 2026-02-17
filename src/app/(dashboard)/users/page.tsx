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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Edit, RefreshCw, TrendingUp, Activity, ChevronDown, ChevronRight, DollarSign, Mail, UserX, Ban, Copy, Check, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Palette, ChevronUp, Trash2 } from "lucide-react";
import { fetchUsers, updateUserProfile, toggleTempSuspend, togglePermSuspend, deleteUserAccount } from "@/lib/api";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

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
  metadata: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
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

type SortField = "name" | "email" | "tier" | "created" | "lastActivity" | "payment";
type SortDirection = "asc" | "desc";
type ColorTheme = "default" | "warm" | "cool" | "vibrant";

const COLOR_THEMES = {
  default: {
    free: "bg-slate-500",
    premium: "bg-blue-500",
    max: "bg-purple-500",
    active: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500",
  },
  warm: {
    free: "bg-orange-400",
    premium: "bg-amber-500",
    max: "bg-rose-500",
    active: "bg-emerald-500",
    warning: "bg-yellow-500",
    danger: "bg-red-600",
  },
  cool: {
    free: "bg-cyan-400",
    premium: "bg-sky-500",
    max: "bg-indigo-500",
    active: "bg-teal-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
  },
  vibrant: {
    free: "bg-lime-500",
    premium: "bg-fuchsia-500",
    max: "bg-violet-600",
    active: "bg-green-600",
    warning: "bg-orange-500",
    danger: "bg-red-600",
  },
};

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [regexMode, setRegexMode] = useState(false);
  const [regexError, setRegexError] = useState("");
  const [sortField, setSortField] = useState<SortField>("created");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [compactView, setCompactView] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [colorTheme, setColorTheme] = useState<ColorTheme>("default");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [editDialog, setEditDialog] = useState<{ open: boolean; user?: UserProfile }>({ open: false });
  const [confirmEditDialog, setConfirmEditDialog] = useState(false);
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; type: "temp" | "perm" | null; user?: UserProfile; action: "suspend" | "restore" }>({ open: false, type: null, action: "suspend" });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user?: UserProfile }>({ open: false });
  const [confirmEmail, setConfirmEmail] = useState("");
  const [bypassConfirmation, setBypassConfirmation] = useState(false);
  const [showBypassOption, setShowBypassOption] = useState(false);
  const [editForm, setEditForm] = useState({
    subscription_tier: "",
    role: "",
    full_name: "",
    display_name: "",
    email: "",
    billing_customer_id: "",
    newsletter_opt_in: false,
    announcements_opt_in: false,
    alerts_opt_in: false,
    events_and_promotions_opt_in: false,
  });

  // Advanced filters
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const savedTheme = localStorage.getItem("users-color-theme") as ColorTheme;
    if (savedTheme) setColorTheme(savedTheme);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
      applyFiltersAndSort(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFiltersAndSort(users);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, regexMode, tierFilter, paymentFilter, activityFilter, statusFilter, sortField, sortDirection, users]);

  const applyFiltersAndSort = (data: UserProfile[]) => {
    let filtered = [...data];
    
    // Search filter
    if (searchQuery) {
      if (regexMode) {
        try {
          const regex = new RegExp(searchQuery, "i");
          setRegexError("");
          filtered = filtered.filter(u => 
            regex.test(u.full_name || "") ||
            regex.test(u.email || "") ||
            regex.test(u.display_name || "") ||
            regex.test(u.id)
          );
        } catch {
          setRegexError("Invalid regex pattern");
        }
      } else {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(u => 
          u.full_name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.display_name?.toLowerCase().includes(query) ||
          u.id.toLowerCase().includes(query)
        );
      }
    }

    // Tier filter
    if (tierFilter !== "all") {
      filtered = filtered.filter(u => (u.subscription_tier || "free") === tierFilter);
    }

    // Payment filter
    if (paymentFilter === "paying") {
      filtered = filtered.filter(u => u.subscription_tier && u.subscription_tier !== "free");
    } else if (paymentFilter === "free") {
      filtered = filtered.filter(u => !u.subscription_tier || u.subscription_tier === "free");
    } else if (paymentFilter === "with-billing") {
      filtered = filtered.filter(u => u.billing_customer_id);
    }

    // Activity filter
    if (activityFilter === "active") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      filtered = filtered.filter(u => u.lastActivity && u.lastActivity > thirtyDaysAgo);
    } else if (activityFilter === "inactive") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      filtered = filtered.filter(u => !u.lastActivity || u.lastActivity <= thirtyDaysAgo);
    }

    // Status filter
    if (statusFilter === "suspended") {
      filtered = filtered.filter(u => u.temp_suspend || u.perm_suspend);
    } else if (statusFilter === "active") {
      filtered = filtered.filter(u => !u.temp_suspend && !u.perm_suspend);
    } else if (statusFilter === "temp-suspended") {
      filtered = filtered.filter(u => u.temp_suspend);
    } else if (statusFilter === "perm-suspended") {
      filtered = filtered.filter(u => u.perm_suspend);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = (a.full_name || a.display_name || "").localeCompare(b.full_name || b.display_name || "");
          break;
        case "email":
          comparison = (a.email || "").localeCompare(b.email || "");
          break;
        case "tier":
          const tierOrder = { free: 0, premium: 1, max: 2 };
          comparison = (tierOrder[a.subscription_tier as keyof typeof tierOrder] || 0) - (tierOrder[b.subscription_tier as keyof typeof tierOrder] || 0);
          break;
        case "created":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "lastActivity":
          const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          comparison = aTime - bTime;
          break;
        case "payment":
          const aPrice = TIER_PRICES[a.subscription_tier as keyof typeof TIER_PRICES] || 0;
          const bPrice = TIER_PRICES[b.subscription_tier as keyof typeof TIER_PRICES] || 0;
          comparison = aPrice - bPrice;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    setFilteredUsers(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const openEditDialog = (user: UserProfile) => {
    setEditForm({
      subscription_tier: user.subscription_tier || "free",
      role: user.role || "user",
      full_name: user.full_name || "",
      display_name: user.display_name || "",
      email: user.email || "",
      billing_customer_id: user.billing_customer_id || "",
      newsletter_opt_in: user.newsletter_opt_in,
      announcements_opt_in: user.announcements_opt_in,
      alerts_opt_in: user.alerts_opt_in,
      events_and_promotions_opt_in: user.events_and_promotions_opt_in,
    });
    setShowAdvanced(false);
    setEditDialog({ open: true, user });
  };

  const handleSaveUser = async () => {
    if (!editDialog.user) return;
    setConfirmEditDialog(false);
    setEditDialog({ open: false });
    
    try {
      await updateUserProfile(editDialog.user.id, editForm);
      await loadData();
    } catch (err) {
      console.error("Failed to update user:", err);
      alert("Failed to update user. Please try again.");
    }
  };

  const openSuspendDialog = (user: UserProfile, type: "temp" | "perm", action: "suspend" | "restore") => {
    setSuspendDialog({ open: true, type, user, action });
    setConfirmEmail("");
    setBypassConfirmation(false);
    setShowBypassOption(false);
  };

  const handleSuspendConfirm = async () => {
    if (!suspendDialog.user || !suspendDialog.type) return;
    
    // Check email confirmation for permanent suspension (only for suspend action, not restore)
    if (suspendDialog.type === "perm" && suspendDialog.action === "suspend") {
      if (!bypassConfirmation && confirmEmail !== suspendDialog.user.email) {
        alert("Email address does not match. Please type the correct email address to confirm.");
        return;
      }
    }
    
    setSuspendDialog({ open: false, type: null, action: "suspend" });
    setConfirmEmail("");
    setBypassConfirmation(false);
    setShowBypassOption(false);
    
    try {
      if (suspendDialog.type === "temp") {
        await toggleTempSuspend(suspendDialog.user.id, suspendDialog.action === "suspend");
      } else {
        await togglePermSuspend(suspendDialog.user.id, suspendDialog.action === "suspend");
      }
      await loadData();
    } catch (err) {
      console.error("Failed to toggle suspension:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update suspension status. Please try again.";
      alert(errorMessage);
    }
  };

  const openDeleteDialog = (user: UserProfile) => {
    setDeleteDialog({ open: true, user });
    setConfirmEmail("");
    setBypassConfirmation(false);
    setShowBypassOption(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.user) return;
    
    // Check if email matches or bypass is enabled
    if (!bypassConfirmation && confirmEmail !== deleteDialog.user.email) {
      alert("Email address does not match. Please type the correct email address to confirm.");
      return;
    }
    
    setDeleteDialog({ open: false });
    setConfirmEmail("");
    setBypassConfirmation(false);
    setShowBypassOption(false);
    
    try {
      await deleteUserAccount(deleteDialog.user.id);
      await loadData();
    } catch (err) {
      console.error("Failed to delete user:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete user. Please try again.";
      alert(errorMessage);
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

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleThemeChange = (theme: ColorTheme) => {
    setColorTheme(theme);
    localStorage.setItem("users-color-theme", theme);
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

  const applyQuickFilter = (filter: { tier?: string; payment?: string; activity?: string; status?: string }) => {
    if (filter.tier) setTierFilter(filter.tier);
    if (filter.payment) setPaymentFilter(filter.payment);
    if (filter.activity) setActivityFilter(filter.activity);
    if (filter.status) setStatusFilter(filter.status);
  };

  const tierStats = getTierStats();
  const activityStats = getActivityStats();
  const growthStats = getUserGrowth();
  const theme = COLOR_THEMES[colorTheme];

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
          <Select value={colorTheme} onValueChange={(v) => handleThemeChange(v as ColorTheme)}>
            <SelectTrigger className="w-40">
              <Palette className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cool">Cool</SelectItem>
              <SelectItem value="vibrant">Vibrant</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setCompactView(!compactView)}>
            {compactView ? "Expand All" : "Collapse All"}
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <a href="https://app.brevo.com/contact/list" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Brevo Contacts
            </a>
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
            <Activity className={`h-4 w-4 ${theme.active}`} />
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
            <DollarSign className={`h-4 w-4 ${theme.active}`} />
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
            <CardTitle>Quick Filters</CardTitle>
            <CardDescription>Common filter combinations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => applyQuickFilter({ payment: "paying", activity: "active" })}>
              💰 Active Paying Users
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => applyQuickFilter({ tier: "max", activity: "active" })}>
              👑 Active Max Tier Users
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => applyQuickFilter({ payment: "free", activity: "active" })}>
              🎯 Active Free Users (Conversion Target)
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => applyQuickFilter({ payment: "paying", activity: "inactive" })}>
              ⚠️ Inactive Paying Users (Churn Risk)
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => applyQuickFilter({ status: "suspended" })}>
              🚫 All Suspended Users
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Advanced Search & Filters</CardTitle>
          <CardDescription>Regex search and multi-dimensional filtering</CardDescription>
          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={regexMode ? "Regex pattern (e.g., ^Har.*)" : "Search users..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={regexMode ? "default" : "outline"}
                onClick={() => setRegexMode(!regexMode)}
              >
                {regexMode ? "Regex ON" : "Regex OFF"}
              </Button>
            </div>
            {regexError && <p className="text-xs text-red-500">{regexError}</p>}
            
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label className="text-xs">Subscription Tier</Label>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="max">Max</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Payment Status</Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Status</SelectItem>
                    <SelectItem value="paying">Paying Users</SelectItem>
                    <SelectItem value="free">Free Users</SelectItem>
                    <SelectItem value="with-billing">With Billing ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Activity</Label>
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activity</SelectItem>
                    <SelectItem value="active">Active (30d)</SelectItem>
                    <SelectItem value="inactive">Inactive (30d+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Account Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">All Suspended</SelectItem>
                    <SelectItem value="temp-suspended">Temp Suspended</SelectItem>
                    <SelectItem value="perm-suspended">Perm Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-3">
            Showing {filteredUsers.length} of {users.length} users
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                    <div className="flex items-center">Name <SortIcon field="name" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("email")}>
                    <div className="flex items-center">Email <SortIcon field="email" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("tier")}>
                    <div className="flex items-center">Tier <SortIcon field="tier" /></div>
                  </TableHead>
                  {!compactView && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort("payment")}>
                      <div className="flex items-center">Payment <SortIcon field="payment" /></div>
                    </TableHead>
                  )}
                  <TableHead className="cursor-pointer" onClick={() => handleSort("lastActivity")}>
                    <div className="flex items-center">Last Active <SortIcon field="lastActivity" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("created")}>
                    <div className="flex items-center">Joined <SortIcon field="created" /></div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <>
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleRow(user.id)}>
                          {expandedRows.has(user.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{user.full_name || user.display_name || "Anonymous"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            (user.subscription_tier || "free") === "max" ? theme.max :
                            user.subscription_tier === "premium" ? theme.premium : theme.free
                          }
                        >
                          {(user.subscription_tier || "free").toUpperCase()}
                        </Badge>
                      </TableCell>
                      {!compactView && (
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
                      <TableCell>
                        <span className="text-sm">{getLastActivityText(user.lastActivity)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(user.id) && (
                      <TableRow key={`${user.id}-expanded`}>
                        <TableCell colSpan={compactView ? 7 : 8} className="bg-muted/30">
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="font-semibold text-xs text-muted-foreground mb-1">User ID</div>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-muted px-2 py-1 rounded">{user.id}</code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => copyToClipboard(user.id, user.id)}
                                  >
                                    {copiedId === user.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </div>
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
                                <div className="flex items-center gap-2">
                                  {user.billing_customer_id ? (
                                    <>
                                      <code className="text-xs bg-muted px-2 py-1 rounded">{user.billing_customer_id}</code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => copyToClipboard(user.billing_customer_id!, `billing-${user.id}`)}
                                      >
                                        {copiedId === `billing-${user.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">None</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {(user.subscription_tier && user.subscription_tier !== "free") && (
                              <div className="border-t pt-3">
                                <div className="font-semibold text-sm mb-2">Subscription Info</div>
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Duration: </span>
                                    {getSubscriptionDuration(user.created_at, user.subscription_tier)}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Monthly: </span>
                                    ${TIER_PRICES[user.subscription_tier as keyof typeof TIER_PRICES]}/mo
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Tier: </span>
                                    {user.subscription_tier.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="border-t pt-3">
                              <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Communication Preferences
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${user.newsletter_opt_in ? theme.active : "bg-gray-300"}`} />
                                  <span className="text-sm">Newsletter</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${user.announcements_opt_in ? theme.active : "bg-gray-300"}`} />
                                  <span className="text-sm">Announcements</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${user.alerts_opt_in ? theme.active : "bg-gray-300"}`} />
                                  <span className="text-sm">Alerts</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${user.events_and_promotions_opt_in ? theme.active : "bg-gray-300"}`} />
                                  <span className="text-sm">Events & Promos</span>
                                </div>
                              </div>
                            </div>

                            <div className="border-t pt-3">
                              <div className="font-semibold text-sm mb-2">Account Status</div>
                              <div className="flex gap-2 flex-wrap">
                                {user.role === "admin" && <Badge className={theme.danger}>Admin</Badge>}
                                {user.perm_suspend && <Badge className={theme.danger}><Ban className="h-3 w-3 mr-1" />Perm Suspended</Badge>}
                                {user.temp_suspend && <Badge className={theme.warning}><UserX className="h-3 w-3 mr-1" />Temp Suspended</Badge>}
                                {!user.temp_suspend && !user.perm_suspend && <Badge className={theme.active}>Active</Badge>}
                              </div>
                            </div>

                            <div className="flex gap-2 border-t pt-3 flex-wrap">
                              {!user.temp_suspend && !user.perm_suspend && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => openSuspendDialog(user, "temp", "suspend")}>
                                    <UserX className="h-3 w-3 mr-1" />
                                    Temp Suspend
                                  </Button>
                                  <Button variant="outline" size="sm" className="border-red-500 text-red-600 hover:bg-red-50" onClick={() => openSuspendDialog(user, "perm", "suspend")}>
                                    <Ban className="h-3 w-3 mr-1" />
                                    Perm Suspend
                                  </Button>
                                </>
                              )}
                              {user.temp_suspend && (
                                <Button variant="outline" size="sm" className="border-green-500 text-green-600 hover:bg-green-50" onClick={() => openSuspendDialog(user, "temp", "restore")}>
                                  Restore from Temp Suspension
                                </Button>
                              )}
                              {user.perm_suspend && (
                                <Button variant="outline" size="sm" className="border-green-500 text-green-600 hover:bg-green-50" onClick={() => openSuspendDialog(user, "perm", "restore")}>
                                  Restore from Perm Suspension
                                </Button>
                              )}
                              <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(user)}>
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete User
                              </Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User: {editDialog.user?.full_name || editDialog.user?.email}</DialogTitle>
            <DialogDescription>Update user profile, subscription, and preferences</DialogDescription>
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

            <div className="border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full justify-between"
              >
                <span className="font-semibold">Advanced Settings</span>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {showAdvanced && (
                <div className="mt-4 space-y-3 p-4 bg-muted/50 rounded-md">
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">Display Name</Label>
                    <Input
                      value={editForm.display_name}
                      onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                      placeholder="Display name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Input
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Email address"
                      type="email"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">Billing Customer ID</Label>
                    <Input
                      value={editForm.billing_customer_id}
                      onChange={(e) => setEditForm({ ...editForm, billing_customer_id: e.target.value })}
                      placeholder="Billing customer ID"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false })}>
              Cancel
            </Button>
            <Button onClick={() => setConfirmEditDialog(true)} className="bg-orange-600 hover:bg-orange-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmEditDialog} onOpenChange={setConfirmEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirm User Profile Changes</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>You are about to update the profile for:</p>
                <p className="font-medium">{editDialog.user?.email}</p>
                <p className="text-sm mt-3">This action will modify user data in the database. Please ensure all changes are correct before proceeding.</p>
                <p className="text-xs text-muted-foreground mt-2">Changes will be applied immediately and data will be refetched.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveUser} className="bg-orange-600 hover:bg-orange-700">
              Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={suspendDialog.open} onOpenChange={(open: boolean) => setSuspendDialog({ ...suspendDialog, open })}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendDialog.action === "suspend" ? "Suspend User Account" : "Restore User Account"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {suspendDialog.action === "suspend" ? (
                  <>
                    {suspendDialog.type === "perm" ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-red-600">⚠️ PERMANENT SUSPENSION</p>
                        <p>This will <strong>permanently suspend</strong> the account for:</p>
                        <p className="font-medium text-lg">{suspendDialog.user?.email}</p>
                        <p className="text-sm">This is a severe action. The user will be unable to access the platform until manually restored by an admin.</p>
                        <p className="text-xs text-muted-foreground mt-2">Database will be updated immediately and data will be refetched.</p>
                        
                        {!bypassConfirmation && (
                          <div className="mt-4 space-y-2">
                            <Label htmlFor="suspend-email-confirm" className="text-sm font-medium">
                              Type the user&apos;s email address to confirm permanent suspension:
                            </Label>
                            <Input
                              id="suspend-email-confirm"
                              type="email"
                              placeholder={suspendDialog.user?.email || ""}
                              value={confirmEmail}
                              onChange={(e) => setConfirmEmail(e.target.value)}
                              className="border-red-300 focus:border-red-500"
                            />
                          </div>
                        )}
                        
                        {bypassConfirmation && (
                          <div className="mt-4 p-3 bg-orange-50 border border-orange-300 rounded">
                            <p className="text-sm text-orange-800 font-medium">
                              ⚠️ Email confirmation bypassed. You can proceed without typing the email.
                            </p>
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowBypassOption(!showBypassOption)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showBypassOption ? "rotate-180" : ""}`} />
                            Advanced Options
                          </Button>
                          {showBypassOption && (
                            <div className="mt-2 p-3 bg-muted rounded space-y-2">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="bypass-suspend-confirm"
                                  checked={bypassConfirmation}
                                  onCheckedChange={setBypassConfirmation}
                                />
                                <Label htmlFor="bypass-suspend-confirm" className="text-sm cursor-pointer">
                                  Proceed without email confirmation
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Enable this to bypass the email confirmation requirement. Use with caution.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-semibold text-yellow-600">⚠️ TEMPORARY SUSPENSION</p>
                        <p>This will <strong>temporarily suspend</strong> the account for:</p>
                        <p className="font-medium">{suspendDialog.user?.email}</p>
                        <p className="text-sm">This is a reversible action. You can lift the suspension at any time.</p>
                        <p className="text-xs text-muted-foreground mt-2">Database will be updated immediately and data will be refetched.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <p>Are you sure you want to restore access for:</p>
                    <p className="font-medium">{suspendDialog.user?.email}</p>
                    <p className="text-sm">The user will regain full access to their account.</p>
                    <p className="text-xs text-muted-foreground mt-2">Database will be updated immediately and data will be refetched.</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConfirmEmail("");
              setBypassConfirmation(false);
              setShowBypassOption(false);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendConfirm}
              className={suspendDialog.action === "suspend" && suspendDialog.type === "perm" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {suspendDialog.action === "suspend" ? "Confirm Suspension" : "Confirm Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open: boolean) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ Delete User Account</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-semibold text-red-600">⚠️ DESTRUCTIVE ACTION - CANNOT BE UNDONE</p>
                <p>You are about to <strong>permanently delete</strong> the account for:</p>
                <p className="font-medium text-lg">{deleteDialog.user?.email}</p>
                <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
                  <p className="text-sm font-semibold text-red-800">This will:</p>
                  <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Delete the user profile from the database</li>
                    <li>Remove all associated user data</li>
                    <li>Delete the authentication account</li>
                    <li>Cannot be recovered or undone</li>
                  </ul>
                </div>
                <p className="text-sm font-medium mt-3">Consider using <strong>Permanent Suspension</strong> instead if you want to preserve the option to restore access later.</p>
                
                {!bypassConfirmation && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="delete-email-confirm" className="text-sm font-medium">
                      Type the user&apos;s email address to confirm deletion:
                    </Label>
                    <Input
                      id="delete-email-confirm"
                      type="email"
                      placeholder={deleteDialog.user?.email || ""}
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      className="border-red-300 focus:border-red-500"
                    />
                  </div>
                )}
                
                {bypassConfirmation && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-300 rounded">
                    <p className="text-sm text-orange-800 font-medium">
                      ⚠️ Email confirmation bypassed. You can proceed without typing the email.
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBypassOption(!showBypassOption)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showBypassOption ? "rotate-180" : ""}`} />
                    Advanced Options
                  </Button>
                  {showBypassOption && (
                    <div className="mt-2 p-3 bg-muted rounded space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="bypass-delete-confirm"
                          checked={bypassConfirmation}
                          onCheckedChange={setBypassConfirmation}
                        />
                        <Label htmlFor="bypass-delete-confirm" className="text-sm cursor-pointer">
                          Proceed without email confirmation
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enable this to bypass the email confirmation requirement. Use with caution.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConfirmEmail("");
              setBypassConfirmation(false);
              setShowBypassOption(false);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
