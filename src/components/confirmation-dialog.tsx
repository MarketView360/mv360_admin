"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertTriangle, Shield, Trash2, Ban, UserX } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  requireEmailConfirmation?: boolean;
  confirmEmail?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  icon?: React.ReactNode;
  bypassOption?: boolean;
  onBypassChange?: (bypass: boolean) => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  requireEmailConfirmation = false,
  confirmEmail,
  onConfirm,
  loading = false,
  icon,
  bypassOption = false,
  onBypassChange,
}: ConfirmationDialogProps) {
  const [emailInput, setEmailInput] = useState("");
  const [bypass, setBypass] = useState(false);
  const [showBypass, setShowBypass] = useState(false);

  const variantStyles = {
    danger: {
      icon: <Trash2 className="h-5 w-5 text-red-500" />,
      actionClass: "bg-red-600 hover:bg-red-700",
      headerClass: "text-red-600",
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      actionClass: "bg-orange-600 hover:bg-orange-700",
      headerClass: "text-orange-600",
    },
    info: {
      icon: <Shield className="h-5 w-5 text-blue-500" />,
      actionClass: "bg-blue-600 hover:bg-blue-700",
      headerClass: "text-blue-600",
    },
  };

  const styles = variantStyles[variant];

  const isEmailValid = !requireEmailConfirmation || bypass || emailInput === confirmEmail;

  const handleConfirm = async () => {
    if (!isEmailValid) return;
    await onConfirm();
    setEmailInput("");
    setBypass(false);
    setShowBypass(false);
  };

  const handleBypassChange = (checked: boolean) => {
    setBypass(checked);
    onBypassChange?.(checked);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className={`flex items-center gap-2 ${styles.headerClass}`}>
            {icon || styles.icon}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{description}</p>
              
              {requireEmailConfirmation && !bypass && (
                <div className="space-y-2 mt-4">
                  <Label htmlFor="confirm-email" className="text-sm font-medium">
                    Type the email address to confirm:
                  </Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    placeholder={confirmEmail || ""}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="border-red-300 focus:border-red-500"
                  />
                </div>
              )}

              {bypass && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded mt-3">
                  <p className="text-sm text-orange-800">
                    Email confirmation bypassed. Proceed with caution.
                  </p>
                </div>
              )}

              {bypassOption && (
                <div className="mt-4 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBypass(!showBypass)}
                    className="text-xs text-muted-foreground"
                  >
                    Advanced Options
                  </Button>
                  {showBypass && (
                    <div className="mt-2 p-3 bg-muted rounded space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="bypass-confirm"
                          checked={bypass}
                          onCheckedChange={handleBypassChange}
                        />
                        <Label htmlFor="bypass-confirm" className="text-sm cursor-pointer">
                          Bypass email confirmation
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => {
            setEmailInput("");
            setBypass(false);
            setShowBypass(false);
          }}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || !isEmailValid}
            className={styles.actionClass}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
