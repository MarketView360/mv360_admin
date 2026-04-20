"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDebouncedValue } from "./use-debounce";

/**
 * Hook for managing debounced search state
 * Useful for preventing excessive API calls during typing
 */
export function useDebouncedSearch(delay = 300) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, delay);

  // Clear both search states
  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return {
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    clearSearch,
    isDebouncing: searchQuery !== debouncedQuery,
  };
}

/**
 * Hook for paginated data loading
 * Provides page state and load more functionality
 */
export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const nextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback((pageNum: number) => {
    setPage(Math.max(1, pageNum));
  }, []);

  const resetPagination = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    limit,
    setLimit,
    nextPage,
    prevPage,
    goToPage,
    resetPagination,
    offset: (page - 1) * limit,
  };
}

/**
 * Hook for filtering data with multiple filter criteria
 * Returns filter state and change handlers
 */
export function useFilters<T extends Record<string, string>>(initialFilters: T) {
  const [filters, setFilters] = useState<T>(initialFilters);

  const setFilter = useCallback((key: keyof T, value: T[keyof T]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const clearFilter = useCallback((key: keyof T) => {
    setFilters((prev) => ({ ...prev, [key]: initialFilters[key] }));
  }, [initialFilters]);

  // Check if any filter is active (different from initial)
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(
      ([key, value]) => value !== initialFilters[key as keyof T]
    );
  }, [filters, initialFilters]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    clearFilter,
    hasActiveFilters,
  };
}

/**
 * Hook for sorting data with sort field and direction
 */
export function useSort<T extends string>(initialField: T, initialDirection: "asc" | "desc" = "desc") {
  const [sortField, setSortField] = useState<T>(initialField);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialDirection);

  const handleSort = useCallback((field: T) => {
    if (sortField === field) {
      setSortDirection((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  const resetSort = useCallback(() => {
    setSortField(initialField);
    setSortDirection(initialDirection);
  }, [initialField, initialDirection]);

  return {
    sortField,
    sortDirection,
    handleSort,
    resetSort,
    sortString: `${sortField}.${sortDirection}`,
  };
}

/**
 * Hook for tracking expanded rows in tables
 * Useful for collapsible row details
 */
export function useExpandedRows<T>(initialExpanded: Set<T> = new Set()) {
  const [expandedRows, setExpandedRows] = useState<Set<T>>(initialExpanded);

  const toggleRow = useCallback((id: T) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandRow = useCallback((id: T) => {
    setExpandedRows((prev) => new Set(prev).add(id));
  }, []);

  const collapseRow = useCallback((id: T) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const expandAll = useCallback((ids: T[]) => {
    setExpandedRows(new Set(ids));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedRows(new Set());
  }, []);

  const isExpanded = useCallback((id: T) => expandedRows.has(id), [expandedRows]);

  return {
    expandedRows,
    toggleRow,
    expandRow,
    collapseRow,
    expandAll,
    collapseAll,
    isExpanded,
  };
}

/**
 * Hook for managing table view mode (compact vs expanded)
 */
export function useViewMode<T extends string>(initialMode: T) {
  const [viewMode, setViewMode] = useState<T>(initialMode);

  const toggleViewMode = useCallback((mode: T) => {
    setViewMode(mode);
  }, []);

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
  };
}

/**
 * Hook for clipboard operations with feedback
 */
export function useClipboard(timeout = 2000) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        setCopiedId(null);
      }, timeout);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [timeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    copiedId,
    copyToClipboard,
    isCopied: (id: string) => copiedId === id,
  };
}

/**
 * Hook for local storage state persistence
 * Useful for user preferences that should persist
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) as T : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Remove item from storage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return {
    value: storedValue,
    setValue,
    removeValue,
  };
}