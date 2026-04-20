"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Plus,
  X,
  Filter,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";

// All searchable fields from user_profiles
export const SEARCHABLE_FIELDS = [
  { key: "full_name", label: "Full Name", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "display_name", label: "Display Name", type: "text" },
  { key: "id", label: "User ID", type: "uuid" },
  { key: "subscription_tier", label: "Subscription Tier", type: "select", options: ["free", "premium", "max"] },
  { key: "role", label: "Role", type: "select", options: ["user", "admin"] },
  { key: "professional_role", label: "Professional Role", type: "text" },
  { key: "experience_level", label: "Experience Level", type: "select", options: ["beginner", "intermediate", "advanced", "expert"] },
  { key: "investment_style", label: "Investment Style", type: "array" },
  { key: "primary_goal", label: "Primary Goal", type: "array" },
  { key: "interests", label: "Interests", type: "array" },
  { key: "usage_frequency", label: "Usage Frequency", type: "select", options: ["daily", "weekly", "monthly", "occasionally"] },
  { key: "referral_source", label: "Referral Source", type: "text" },
  { key: "timezone", label: "Timezone", type: "text" },
  { key: "onboarded_at", label: "Onboarded At", type: "date" },
  { key: "created_at", label: "Created At", type: "date" },
  { key: "lastActivity", label: "Last Activity", type: "date" },
  { key: "temp_suspend", label: "Temp Suspended", type: "boolean" },
  { key: "perm_suspend", label: "Perm Suspended", type: "boolean" },
  { key: "onboarding_skipped", label: "Onboarding Skipped", type: "boolean" },
  { key: "newsletter_opt_in", label: "Newsletter", type: "boolean" },
  { key: "razorpay_customer_id", label: "Razorpay Customer ID", type: "text" },
  { key: "billing_customer_id", label: "Billing Customer ID", type: "text" },
  { key: "has_subscription", label: "Has Active Subscription", type: "boolean" },
  { key: "screen_count", label: "Screen Count", type: "number" },
  { key: "watchlist_count", label: "Watchlist Count", type: "number" },
];

export const OPERATORS = [
  { key: "equals", label: "Equals", appliesTo: ["text", "select", "boolean", "number", "uuid"] },
  { key: "not_equals", label: "Not Equals", appliesTo: ["text", "select", "boolean", "number", "uuid"] },
  { key: "contains", label: "Contains", appliesTo: ["text", "uuid"] },
  { key: "not_contains", label: "Not Contains", appliesTo: ["text", "uuid"] },
  { key: "starts_with", label: "Starts With", appliesTo: ["text"] },
  { key: "ends_with", label: "Ends With", appliesTo: ["text"] },
  { key: "regex", label: "Regex Match", appliesTo: ["text"] },
  { key: "is_null", label: "Is Null/Empty", appliesTo: ["text", "date", "array", "uuid"] },
  { key: "is_not_null", label: "Is Not Null", appliesTo: ["text", "date", "array", "uuid"] },
  { key: "greater_than", label: "Greater Than", appliesTo: ["number", "date"] },
  { key: "less_than", label: "Less Than", appliesTo: ["number", "date"] },
  { key: "between", label: "Between", appliesTo: ["number", "date"] },
  { key: "in_array", label: "Contains Value", appliesTo: ["array"] },
  { key: "not_in_array", label: "Doesn't Contain", appliesTo: ["array"] },
];

interface FilterConstraint {
  id: string;
  field: string;
  operator: string;
  value: string;
  value2?: string; // For "between" operator
}

interface AdvancedSearchEngineProps {
  users: any[];
  onFilterChange: (filteredUsers: any[]) => void;
  savedFilters?: { name: string; constraints: FilterConstraint[] }[];
  onSaveFilter?: (name: string, constraints: FilterConstraint[]) => void;
}

export function AdvancedSearchEngine({
  users,
  onFilterChange,
  savedFilters = [],
  onSaveFilter,
}: AdvancedSearchEngineProps) {
  const [constraints, setConstraints] = useState<FilterConstraint[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [logicOperator, setLogicOperator] = useState<"AND" | "OR">("AND");
  const [savedFilterName, setSavedFilterName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const uniqueValues = useMemo(() => {
    const values: Record<string, string[]> = {};
    SEARCHABLE_FIELDS.forEach((field) => {
      if (field.type === "text" || field.type === "array") {
        const set = new Set<string>();
        users.forEach((u) => {
          const val = u[field.key];
          if (val) {
            if (Array.isArray(val)) {
              val.forEach((v) => set.add(v));
            } else {
              set.add(val);
            }
          }
        });
        values[field.key] = Array.from(set).sort();
      }
    });
    return values;
  }, [users]);

  const addConstraint = () => {
    setConstraints([
      ...constraints,
      {
        id: `constraint-${Date.now()}`,
        field: "full_name",
        operator: "contains",
        value: "",
      },
    ]);
  };

  const removeConstraint = (id: string) => {
    setConstraints(constraints.filter((c) => c.id !== id));
  };

  const updateConstraint = (id: string, updates: Partial<FilterConstraint>) => {
    setConstraints(
      constraints.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const clearAllConstraints = () => {
    setConstraints([]);
    setGlobalSearch("");
  };

  const getFieldDefinition = (fieldKey: string) =>
    SEARCHABLE_FIELDS.find((f) => f.key === fieldKey);

  const getAvailableOperators = (fieldKey: string) => {
    const field = getFieldDefinition(fieldKey);
    if (!field) return OPERATORS;
    return OPERATORS.filter((op) => op.appliesTo.includes(field.type));
  };

  const evaluateConstraint = (user: any, constraint: FilterConstraint): boolean => {
    const fieldValue = user[constraint.field];
    const value = constraint.value.toLowerCase();
    const value2 = constraint.value2?.toLowerCase();

    switch (constraint.operator) {
      case "equals":
        if (constraint.field === "subscription_tier") {
          return (fieldValue || "free") === value;
        }
        return (fieldValue?.toString()?.toLowerCase() || "") === value;
      case "not_equals":
        if (constraint.field === "subscription_tier") {
          return (fieldValue || "free") !== value;
        }
        return (fieldValue?.toString()?.toLowerCase() || "") !== value;
      case "contains":
        return fieldValue?.toString()?.toLowerCase()?.includes(value) || false;
      case "not_contains":
        return !fieldValue?.toString()?.toLowerCase()?.includes(value);
      case "starts_with":
        return fieldValue?.toString()?.toLowerCase()?.startsWith(value) || false;
      case "ends_with":
        return fieldValue?.toString()?.toLowerCase()?.endsWith(value) || false;
      case "regex":
        try {
          return new RegExp(value, "i").test(fieldValue?.toString() || "");
        } catch {
          return false;
        }
      case "is_null":
        return !fieldValue || fieldValue === "" || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case "is_not_null":
        return fieldValue && fieldValue !== "" && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      case "greater_than":
        if (constraint.field.includes("_at") || constraint.field === "lastActivity") {
          return fieldValue && new Date(fieldValue) > new Date(value);
        }
        return Number(fieldValue) > Number(value);
      case "less_than":
        if (constraint.field.includes("_at") || constraint.field === "lastActivity") {
          return fieldValue && new Date(fieldValue) < new Date(value);
        }
        return Number(fieldValue) < Number(value);
      case "between":
        if (constraint.field.includes("_at") || constraint.field === "lastActivity") {
          if (!fieldValue) return false;
          const d = new Date(fieldValue);
          return d >= new Date(value) && d <= new Date(value2 || value);
        }
        return Number(fieldValue) >= Number(value) && Number(fieldValue) <= Number(value2 || value);
      case "in_array":
        return Array.isArray(fieldValue) && fieldValue.some((v) => v.toLowerCase().includes(value));
      case "not_in_array":
        return !Array.isArray(fieldValue) || !fieldValue.some((v) => v.toLowerCase().includes(value));
      default:
        return true;
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users;

    // Global search first
    if (globalSearch) {
      const query = globalSearch.toLowerCase();
      result = result.filter((u) =>
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.display_name?.toLowerCase().includes(query) ||
        u.id?.toLowerCase().includes(query) ||
        u.professional_role?.toLowerCase().includes(query) ||
        u.referral_source?.toLowerCase().includes(query)
      );
    }

    // Apply constraints
    if (constraints.length > 0) {
      if (logicOperator === "AND") {
        result = result.filter((u) => constraints.every((c) => evaluateConstraint(u, c)));
      } else {
        result = result.filter((u) => constraints.some((c) => evaluateConstraint(u, c)));
      }
    }

    return result;
  }, [users, globalSearch, constraints, logicOperator]);

  // Notify parent of filtered results
  useMemo(() => {
    onFilterChange(filteredUsers);
  }, [filteredUsers, onFilterChange]);

  const handleSaveFilter = () => {
    if (savedFilterName && constraints.length > 0 && onSaveFilter) {
      onSaveFilter(savedFilterName, constraints);
      setSavedFilterName("");
      setShowSaveDialog(false);
    }
  };

  const loadSavedFilter = (saved: { constraints: FilterConstraint[] }) => {
    setConstraints(saved.constraints.map((c) => ({ ...c, id: `constraint-${Date.now()}-${Math.random()}` })));
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search Engine
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Global Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Quick search across all text fields..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {constraints.length > 0 && (
              <Select value={logicOperator} onValueChange={(v) => setLogicOperator(v as "AND" | "OR")}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Constraints */}
          <div className="space-y-2">
            {constraints.map((constraint, index) => (
              <div key={constraint.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                <Badge variant="outline" className="shrink-0">
                  #{index + 1}
                </Badge>

                {/* Field Selector */}
                <Select
                  value={constraint.field}
                  onValueChange={(v) => updateConstraint(constraint.id, { field: v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCHABLE_FIELDS.map((f) => (
                      <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator Selector */}
                <Select
                  value={constraint.operator}
                  onValueChange={(v) => updateConstraint(constraint.id, { operator: v })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableOperators(constraint.field).map((op) => (
                      <SelectItem key={op.key} value={op.key}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value Input - hide for is_null/is_not_null */}
                {!["is_null", "is_not_null"].includes(constraint.operator) && (
                  <>
                    {getFieldDefinition(constraint.field)?.type === "boolean" ? (
                      <Select
                        value={constraint.value}
                        onValueChange={(v) => updateConstraint(constraint.id, { value: v })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : getFieldDefinition(constraint.field)?.type === "select" ? (
                      <Select
                        value={constraint.value}
                        onValueChange={(v) => updateConstraint(constraint.id, { value: v })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getFieldDefinition(constraint.field)?.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : constraint.field.includes("_at") || constraint.field === "lastActivity" ? (
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={constraint.value}
                          onChange={(e) => updateConstraint(constraint.id, { value: e.target.value })}
                          className="w-36"
                        />
                        {constraint.operator === "between" && (
                          <Input
                            type="date"
                            value={constraint.value2 || ""}
                            onChange={(e) => updateConstraint(constraint.id, { value2: e.target.value })}
                            className="w-36"
                            placeholder="End date"
                          />
                        )}
                      </div>
                    ) : getFieldDefinition(constraint.field)?.type === "array" ? (
                      <Select
                        value={constraint.value}
                        onValueChange={(v) => updateConstraint(constraint.id, { value: v })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select value" />
                        </SelectTrigger>
                        <SelectContent>
                          {(uniqueValues[constraint.field] || []).slice(0, 50).map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={constraint.value}
                        onChange={(e) => updateConstraint(constraint.id, { value: e.target.value })}
                        placeholder="Value"
                        className="flex-1 min-w-[120px]"
                      />
                    )}
                  </>
                )}

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  onClick={() => removeConstraint(constraint.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addConstraint}>
                <Plus className="h-4 w-4 mr-1" />
                Add Constraint
              </Button>
              {constraints.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllConstraints}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredUsers.length} of {users.length} users match
            </div>
          </div>

          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <Label className="text-xs">Saved Filters:</Label>
              {savedFilters.map((saved) => (
                <Button
                  key={saved.name}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSavedFilter(saved)}
                >
                  {saved.name}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}