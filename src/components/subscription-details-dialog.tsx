"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CreditCard,
  Calendar,
  IndianRupee,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Receipt,
  TrendingUp,
  Copy,
  Check,
} from "lucide-react";
import { fetchUserSubscriptionDetails, fetchUserPayments, UserSubscriptionDetails, UserPayment } from "@/lib/api";

interface SubscriptionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  pending: "bg-blue-500",
  canceled: "bg-red-500",
  expired: "bg-gray-500",
  captured: "bg-green-500",
  failed: "bg-red-500",
  authorized: "bg-blue-500",
  refunded: "bg-orange-500",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  pending: "Pending",
  canceled: "Canceled",
  expired: "Expired",
  captured: "Captured",
  failed: "Failed",
  authorized: "Authorized",
  refunded: "Refunded",
};

export function SubscriptionDetailsDialog({
  open,
  onClose,
  userId,
  userEmail,
}: SubscriptionDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<UserSubscriptionDetails | null>(null);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      Promise.all([
        fetchUserSubscriptionDetails(userId),
        fetchUserPayments(userId),
      ])
        .then(([detailsData, paymentsData]) => {
          setDetails(detailsData);
          setPayments(paymentsData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, userId]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription & Payment Details
          </DialogTitle>
          <DialogDescription>
            Viewing details for <span className="font-medium">{userEmail}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Subscription Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                {details?.subscription_status === "active" ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Plan</div>
                      <div className="font-medium">{details.plan_name || "Premium"}</div>
                      <Badge className={`mt-1 ${STATUS_COLORS[details.subscription_status] || "bg-gray-500"}`}>
                        {STATUS_LABELS[details.subscription_status] || details.subscription_status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Amount</div>
                      <div className="font-medium flex items-center gap-1">
                        <IndianRupee className="h-4 w-4" />
                        {formatAmount(details.amount_inr)}/{details.billing_period || "month"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Current Period</div>
                      <div className="font-medium">
                        {formatDate(details.current_period_start)} - {formatDate(details.current_period_end)}
                      </div>
                      {details.current_period_end && (
                        <div className="text-xs mt-1">
                          {(() => {
                            const days = getDaysRemaining(details.current_period_end!);
                            return days > 0 ? `${days} days remaining` : "Period ended";
                          })()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Razorpay Subscription</div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[120px]">
                          {details.razorpay_subscription_id || "N/A"}
                        </code>
                        {details.razorpay_subscription_id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(details.razorpay_subscription_id!, "sub-id")}
                            >
                              {copiedId === "sub-id" ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              asChild
                            >
                              <a
                                href={`https://dashboard.razorpay.com/app/subscriptions/${details.razorpay_subscription_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No active subscription</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Current tier: <Badge className="bg-gray-500">{details?.subscription_tier || "free"}</Badge>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            {details?.payment_method_type && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Default Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {details.payment_method_type === "card" && (
                      <>
                        <div className="h-8 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center text-white text-xs font-bold">
                          {details.card_brand?.toUpperCase() || "CARD"}
                        </div>
                        <div>
                          <div className="font-medium">•••• {details.card_last4}</div>
                          <div className="text-xs text-muted-foreground">Card</div>
                        </div>
                      </>
                    )}
                    {details.payment_method_type === "upi" && (
                      <>
                        <div className="h-8 w-12 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                          UPI
                        </div>
                        <div>
                          <div className="font-medium">{details.card_last4 || "UPI"}</div>
                          <div className="text-xs text-muted-foreground">UPI</div>
                        </div>
                      </>
                    )}
                    {!["card", "upi"].includes(details.payment_method_type) && (
                      <div className="font-medium">{details.payment_method_type}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Payments</div>
                    <div className="font-medium">{details?.total_payments || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Paid</div>
                    <div className="font-medium flex items-center gap-1">
                      <IndianRupee className="h-4 w-4" />
                      {formatAmount(details?.total_paid_inr)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Last Payment</div>
                    <div className="font-medium">{formatDate(details?.last_payment_at)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Razorpay Customer */}
            {details?.razorpay_customer_id && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Razorpay Customer:</div>
                <code className="text-xs bg-background px-2 py-1 rounded">
                  {details.razorpay_customer_id}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(details.razorpay_customer_id!, "cust-id")}
                >
                  {copiedId === "cust-id" ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  asChild
                >
                  <a
                    href={`https://dashboard.razorpay.com/app/customers/${details.razorpay_customer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            )}

            {/* Payment History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No payment records found
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Payment ID</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.slice(0, 10).map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="text-sm">
                              {formatDate(payment.created_at)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatAmount(Number(payment.amount))}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  STATUS_COLORS[payment.status] || "bg-gray-500"
                                }
                              >
                                {STATUS_LABELS[payment.status] || payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {payment.payment_method || payment.card_brand || "-"}
                              {payment.card_last4 && ` ••••${payment.card_last4}`}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {payment.razorpay_payment_id.slice(0, 14)}...
                              </code>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                asChild
                              >
                                <a
                                  href={`https://dashboard.razorpay.com/app/payments/${payment.razorpay_payment_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {details?.razorpay_subscription_id && (
            <Button variant="outline" asChild>
              <a
                href={`https://dashboard.razorpay.com/app/subscriptions/${details.razorpay_subscription_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View in Razorpay
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}