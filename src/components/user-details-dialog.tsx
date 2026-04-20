"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  CreditCard,
  Calendar,
  Shield,
  Settings,
  Edit,
  Save,
  X,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  IndianRupee,
  Copy,
  Check,
  Ban,
  UserX,
  Loader2,
} from "lucide-react";
import {
  updateUserProfile,
  fetchUserSubscriptionDetails,
  fetchUserPayments,
  toggleTempSuspend,
  togglePermSuspend,
  UserSubscriptionDetails,
  UserPayment,
} from "@/lib/api";

interface UserDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  user: any;
  onUpdate: () => void;
}

const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "expert"];
const USAGE_FREQUENCIES = ["daily", "weekly", "monthly", "occasionally"];
const INVESTMENT_STYLES = ["value", "growth", "income", "momentum", "technical", "fundamental"];
const PRIMARY_GOALS = ["wealth_building", "retirement", "education", "emergency_fund", "speculation"];
const TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
  "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin",
];

export function UserDetailsDialog({
  open,
  onClose,
  user,
  onUpdate,
}: UserDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<UserSubscriptionDetails | null>(null);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    full_name: "",
    display_name: "",
    email: "",
    subscription_tier: "free",
    role: "user",
    professional_role: "",
    experience_level: "",
    usage_frequency: "",
    referral_source: "",
    timezone: "",
    investment_style: [] as string[],
    primary_goal: [] as string[],
    newsletter_opt_in: false,
    announcements_opt_in: false,
    alerts_opt_in: false,
    events_and_promotions_opt_in: false,
  });

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      setEditMode(false);
      setActiveTab("profile");

      // Initialize form with user data
      setForm({
        full_name: user.full_name || "",
        display_name: user.display_name || "",
        email: user.email || "",
        subscription_tier: user.subscription_tier || "free",
        role: user.role || "user",
        professional_role: user.professional_role || "",
        experience_level: user.experience_level || "",
        usage_frequency: user.usage_frequency || "",
        referral_source: user.referral_source || "",
        timezone: user.timezone || "",
        investment_style: user.investment_style || [],
        primary_goal: user.primary_goal || [],
        newsletter_opt_in: user.newsletter_opt_in || false,
        announcements_opt_in: user.announcements_opt_in || false,
        alerts_opt_in: user.alerts_opt_in || false,
        events_and_promotions_opt_in: user.events_and_promotions_opt_in || false,
      });

      // Load subscription details if paying user
      if (user.subscription_tier && user.subscription_tier !== "free") {
        Promise.all([
          fetchUserSubscriptionDetails(user.id),
          fetchUserPayments(user.id),
        ])
          .then(([details, paymentsData]) => {
            setSubscriptionDetails(details);
            setPayments(paymentsData);
          })
          .catch(console.error);
      } else {
        setSubscriptionDetails(null);
        setPayments([]);
      }

      setLoading(false);
    }
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await updateUserProfile(user.id, {
        full_name: form.full_name,
        display_name: form.display_name,
        subscription_tier: form.subscription_tier,
        role: form.role,
        professional_role: form.professional_role || undefined,
        experience_level: form.experience_level || undefined,
        usage_frequency: form.usage_frequency || undefined,
        referral_source: form.referral_source || undefined,
        timezone: form.timezone || undefined,
        newsletter_opt_in: form.newsletter_opt_in,
        announcements_opt_in: form.announcements_opt_in,
        alerts_opt_in: form.alerts_opt_in,
        events_and_promotions_opt_in: form.events_and_promotions_opt_in,
      });
      setEditMode(false);
      onUpdate();
    } catch (err) {
      console.error("Failed to save:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArrayField = (field: "investment_style" | "primary_goal", value: string) => {
    setForm((prev) => {
      const arr = prev[field];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((v) => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const handleSuspend = async (type: "temp" | "perm", action: "suspend" | "restore") => {
    if (!user) return;

    const confirmMsg = action === "suspend"
      ? `Are you sure you want to ${type === "perm" ? "PERMANENTLY" : "temporarily"} suspend ${user.email}?`
      : `Are you sure you want to restore ${user.email}?`;

    if (!confirm(confirmMsg)) return;

    setSuspendLoading(true);
    try {
      if (type === "temp") {
        await toggleTempSuspend(user.id, action === "suspend");
      } else {
        await togglePermSuspend(user.id, action === "suspend");
      }
      onUpdate();
    } catch (err) {
      console.error("Failed to toggle suspension:", err);
      alert("Failed to update suspension status.");
    } finally {
      setSuspendLoading(false);
    }
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

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number | null | undefined) => {
    if (!amount) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details: {user.full_name || user.email}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge
              className={
                (user.subscription_tier || "free") === "max"
                  ? "bg-purple-500"
                  : user.subscription_tier === "premium"
                  ? "bg-blue-500"
                  : "bg-slate-500"
              }
            >
              {(user.subscription_tier || "free").toUpperCase()}
            </Badge>
            {user.role === "admin" && <Badge className="bg-red-500">ADMIN</Badge>}
            {user.temp_suspend && <Badge className="bg-yellow-500">TEMP SUSPENDED</Badge>}
            {user.perm_suspend && <Badge className="bg-red-600">PERM SUSPENDED</Badge>}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                    <Button
                      variant={editMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? <X className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
                      {editMode ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* User ID */}
                    <div>
                      <Label className="text-xs text-muted-foreground">User ID</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                          {user.id}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(user.id, "id")}
                        >
                          {copiedId === "id" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      {editMode ? (
                        <Input
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{user.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Full Name */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Full Name</Label>
                      {editMode ? (
                        <Input
                          value={form.full_name}
                          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <span className="mt-1 block">{user.full_name || "—"}</span>
                      )}
                    </div>

                    {/* Display Name */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Display Name</Label>
                      {editMode ? (
                        <Input
                          value={form.display_name}
                          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                          className="mt-1"
                        />
                      ) : (
                        <span className="mt-1 block">{user.display_name || "—"}</span>
                      )}
                    </div>

                    {/* Role */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Role</Label>
                      {editMode ? (
                        <Select
                          value={form.role}
                          onValueChange={(v) => setForm({ ...form, role: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className="mt-1">{user.role}</Badge>
                      )}
                    </div>

                    {/* Tier */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Subscription Tier</Label>
                      {editMode ? (
                        <Select
                          value={form.subscription_tier}
                          onValueChange={(v) => setForm({ ...form, subscription_tier: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="premium">Premium (₹999/mo)</SelectItem>
                            <SelectItem value="max">Max (₹4,999/mo)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          className="mt-1"
                          variant="outline"
                        >
                          {user.subscription_tier || "free"} ({user.subscription_tier === "premium" ? "₹999/mo" : user.subscription_tier === "max" ? "₹4,999/mo" : "₹0"})
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Activity & Engagement</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Screens Saved</Label>
                    <div className="text-xl font-bold mt-1">{user.screenCount || 0}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Watchlists</Label>
                    <div className="text-xl font-bold mt-1">{user.watchlistCount || 0}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Activity</Label>
                    <div className="text-sm mt-1">{formatDate(user.lastActivity)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Joined</Label>
                    <div className="text-sm mt-1">{formatDate(user.created_at)}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Onboarding Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Onboarding & Professional</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Professional Role</Label>
                    {editMode ? (
                      <Input
                        value={form.professional_role}
                        onChange={(e) => setForm({ ...form, professional_role: e.target.value })}
                        className="mt-1"
                        placeholder="e.g., Software Engineer"
                      />
                    ) : (
                      <span className="mt-1 block">{user.professional_role || "—"}</span>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Experience Level</Label>
                    {editMode ? (
                      <Select
                        value={form.experience_level}
                        onValueChange={(v) => setForm({ ...form, experience_level: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPERIENCE_LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="mt-1 block">{user.experience_level || "—"}</span>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Usage Frequency</Label>
                    {editMode ? (
                      <Select
                        value={form.usage_frequency}
                        onValueChange={(v) => setForm({ ...form, usage_frequency: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {USAGE_FREQUENCIES.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="mt-1 block">{user.usage_frequency || "—"}</span>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Referral Source</Label>
                    {editMode ? (
                      <Input
                        value={form.referral_source}
                        onChange={(e) => setForm({ ...form, referral_source: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <span className="mt-1 block">{user.referral_source || "—"}</span>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Timezone</Label>
                    {editMode ? (
                      <Select
                        value={form.timezone}
                        onValueChange={(v) => setForm({ ...form, timezone: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="mt-1 block">{user.timezone || "—"}</span>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Onboarded At</Label>
                    <span className="mt-1 block">
                      {user.onboarded_at ? (
                        <CheckCircle className="h-4 w-4 text-green-500 inline mr-1" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500 inline mr-1" />
                      )}
                      {formatDate(user.onboarded_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {editMode && (
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              )}
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Communication Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label>Newsletter</Label>
                      <Switch
                        checked={form.newsletter_opt_in}
                        onCheckedChange={(v) => setForm({ ...form, newsletter_opt_in: v })}
                        disabled={!editMode}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Announcements</Label>
                      <Switch
                        checked={form.announcements_opt_in}
                        onCheckedChange={(v) => setForm({ ...form, announcements_opt_in: v })}
                        disabled={!editMode}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Alerts</Label>
                      <Switch
                        checked={form.alerts_opt_in}
                        onCheckedChange={(v) => setForm({ ...form, alerts_opt_in: v })}
                        disabled={!editMode}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Events & Promotions</Label>
                      <Switch
                        checked={form.events_and_promotions_opt_in}
                        onCheckedChange={(v) => setForm({ ...form, events_and_promotions_opt_in: v })}
                        disabled={!editMode}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Investment Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm mb-2">Investment Style</Label>
                    <div className="flex gap-2 flex-wrap">
                      {INVESTMENT_STYLES.map((style) => (
                        <Badge
                          key={style}
                          variant={(user.investment_style || []).includes(style) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => editMode && handleToggleArrayField("investment_style", style)}
                        >
                          {style}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm mb-2">Primary Goals</Label>
                    <div className="flex gap-2 flex-wrap">
                      {PRIMARY_GOALS.map((goal) => (
                        <Badge
                          key={goal}
                          variant={(user.primary_goal || []).includes(goal) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => editMode && handleToggleArrayField("primary_goal", goal)}
                        >
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="space-y-4">
              {user.subscription_tier === "free" ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">This user is on the Free tier</p>
                    <p className="text-sm text-muted-foreground mt-1">No subscription or payment history available</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Subscription Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Razorpay Subscription
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Customer ID</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-muted px-2 py-1 rounded truncate">
                            {user.razorpay_customer_id || subscriptionDetails?.razorpay_customer_id || "N/A"}
                          </code>
                          {user.razorpay_customer_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(user.razorpay_customer_id, "cust")}
                            >
                              {copiedId === "cust" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          )}
                          {user.razorpay_customer_id && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                              <a
                                href={`https://dashboard.razorpay.com/app/customers/${user.razorpay_customer_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Subscription ID</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-muted px-2 py-1 rounded truncate">
                            {subscriptionDetails?.razorpay_subscription_id || "N/A"}
                          </code>
                          {subscriptionDetails?.razorpay_subscription_id && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                              <a
                                href={`https://dashboard.razorpay.com/app/subscriptions/${subscriptionDetails.razorpay_subscription_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <Badge
                          className="mt-1"
                          variant={subscriptionDetails?.subscription_status === "active" ? "default" : "secondary"}
                        >
                          {subscriptionDetails?.subscription_status || "N/A"}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Plan</Label>
                        <div className="mt-1">
                          {subscriptionDetails?.plan_name} - {formatAmount(subscriptionDetails?.amount_inr)}/{subscriptionDetails?.billing_period}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Current Period Start</Label>
                        <div className="mt-1">{formatDate(subscriptionDetails?.current_period_start)}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Current Period End</Label>
                        <div className="mt-1">{formatDate(subscriptionDetails?.current_period_end)}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Total Payments</Label>
                        <div className="mt-1 font-bold">{subscriptionDetails?.total_payments || 0}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Total Paid</Label>
                        <div className="mt-1 font-bold flex items-center gap-1">
                          <IndianRupee className="h-4 w-4" />
                          {formatAmount(subscriptionDetails?.total_paid_inr)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment History */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Payment History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {payments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No payments found</p>
                      ) : (
                        <div className="space-y-2">
                          {payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded"
                            >
                              <div className="flex items-center gap-3">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{formatAmount(Number(payment.amount))}</div>
                                  <div className="text-xs text-muted-foreground">{formatDate(payment.created_at)}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={payment.status === "captured" ? "default" : "secondary"}>
                                  {payment.status}
                                </Badge>
                                {payment.card_brand && (
                                  <span className="text-xs">{payment.card_brand} ••••{payment.card_last4}</span>
                                )}
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                  <a
                                    href={`https://dashboard.razorpay.com/app/payments/${payment.razorpay_payment_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Subscription Actions Warning */}
                  <Card className="border-yellow-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-5 w-5" />
                        Important: Razorpay Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Subscription cancellation, pause, and resume actions must be performed directly in the
                        Razorpay Dashboard. The admin console only updates local records.
                      </p>
                      <Button variant="outline" className="mt-2" asChild>
                        <a
                          href={`https://dashboard.razorpay.com/app/subscriptions/${subscriptionDetails?.razorpay_subscription_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in Razorpay Dashboard
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-4">
              {/* Suspension Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Account Suspension
                  </CardTitle>
                  <CardDescription>
                    Temporarily or permanently suspend user access
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Status */}
                  <div className="flex items-center gap-4 p-3 bg-muted rounded">
                    <span className="text-sm">Current Status:</span>
                    {user.perm_suspend ? (
                      <Badge className="bg-red-600"><Ban className="h-3 w-3 mr-1" />Perm Suspended</Badge>
                    ) : user.temp_suspend ? (
                      <Badge className="bg-yellow-500"><UserX className="h-3 w-3 mr-1" />Temp Suspended</Badge>
                    ) : (
                      <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    {!user.temp_suspend && !user.perm_suspend && (
                      <>
                        <Button
                          variant="outline"
                          className="border-yellow-500 text-yellow-600"
                          onClick={() => handleSuspend("temp", "suspend")}
                          disabled={suspendLoading}
                        >
                          {suspendLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserX className="h-4 w-4 mr-2" />}
                          Temp Suspend
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleSuspend("perm", "suspend")}
                          disabled={suspendLoading}
                        >
                          {suspendLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
                          Perm Suspend
                        </Button>
                      </>
                    )}
                    {user.temp_suspend && (
                      <Button
                        variant="outline"
                        className="border-green-500 text-green-600"
                        onClick={() => handleSuspend("temp", "restore")}
                        disabled={suspendLoading}
                      >
                        {suspendLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Restore from Temp Suspension
                      </Button>
                    )}
                    {user.perm_suspend && (
                      <Button
                        variant="outline"
                        className="border-green-500 text-green-600"
                        onClick={() => handleSuspend("perm", "restore")}
                        disabled={suspendLoading}
                      >
                        {suspendLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Restore from Perm Suspension
                      </Button>
                    )}
                  </div>

                  <Separator />

                  {/* Warning */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Temp Suspension:</strong> User cannot login but data is preserved. Can be restored anytime.</p>
                    <p><strong>Perm Suspension:</strong> Severe action. User is permanently blocked. Can only be restored by admin.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-red-600">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    These actions are irreversible. Proceed with caution.
                  </p>
                  <Button variant="destructive" disabled>
                    Delete User Account (Requires separate confirmation dialog)
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}