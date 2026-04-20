"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOverviewStats,
  fetchUsers,
  fetchAnalyticsData,
  fetchSyncLogs,
  fetchSecurityEvents,
  fetchAdminAuthLogs,
  fetchGenesisTickers,
  fetchGenesisLogs,
  fetchGenesisStatus,
  updateUserProfile,
  toggleTempSuspend,
  togglePermSuspend,
  deleteUserAccount,
  inviteUser,
  InviteUserParams,
  InviteUserResult,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Query keys - centralized for easy invalidation
export const queryKeys = {
  overview: ["admin", "overview"] as const,
  users: ["admin", "users"] as const,
  analytics: ["admin", "analytics"] as const,
  syncLogs: (limit: number) => ["admin", "syncLogs", limit] as const,
  securityEvents: (limit: number) => ["admin", "securityEvents", limit] as const,
  adminAuthLogs: (limit: number) => ["admin", "authLogs", limit] as const,
  genesisTickers: (params: {
    page: number;
    limit: number;
    status: string;
    sector: string;
    search: string;
    exchange: string;
  }) => ["admin", "genesis", "tickers", params] as const,
  genesisLogs: (limit: number) => ["admin", "genesis", "logs", limit] as const,
  genesisStatus: ["admin", "genesis", "status"] as const,
};

// ─── Overview Stats Hook ───────────────────────────────────────────────────

export function useOverviewStats() {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: fetchOverviewStats,
    staleTime: 60 * 1000, // 1 minute - overview data doesn't change rapidly
  });
}

// ─── Users Hook ────────────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: fetchUsers,
    staleTime: 2 * 60 * 1000, // 2 minutes - users list doesn't change rapidly
  });
}

// ─── Analytics Hook ────────────────────────────────────────────────────────

export function useAnalytics() {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: fetchAnalyticsData,
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics data is aggregated
    enabled: !!session?.access_token,
  });
}

// ─── Sync Logs Hook ────────────────────────────────────────────────────────

export function useSyncLogs(limit = 50) {
  return useQuery({
    queryKey: queryKeys.syncLogs(limit),
    queryFn: () => fetchSyncLogs(limit),
    staleTime: 30 * 1000, // 30 seconds - logs can change frequently
  });
}

// ─── Security Events Hook ──────────────────────────────────────────────────

export function useSecurityEvents(limit = 100) {
  return useQuery({
    queryKey: queryKeys.securityEvents(limit),
    queryFn: () => fetchSecurityEvents(limit),
    staleTime: 60 * 1000, // 1 minute
  });
}

// ─── Admin Auth Logs Hook ──────────────────────────────────────────────────

export function useAdminAuthLogs(limit = 200) {
  return useQuery({
    queryKey: queryKeys.adminAuthLogs(limit),
    queryFn: () => fetchAdminAuthLogs(limit),
    staleTime: 60 * 1000, // 1 minute
  });
}

// ─── Genesis Tickers Hook ──────────────────────────────────────────────────

export function useGenesisTickers(params: {
  page: number;
  limit: number;
  status: string;
  sector: string;
  search: string;
  exchange: string;
}) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.genesisTickers(params),
    queryFn: () => fetchGenesisTickers(
      session?.access_token || "",
      params.page,
      params.limit,
      params.status,
      params.sector,
      params.search,
      params.exchange
    ),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!session?.access_token,
  });
}

// ─── Genesis Logs Hook ─────────────────────────────────────────────────────

export function useGenesisLogs(limit = 50) {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.genesisLogs(limit),
    queryFn: () => fetchGenesisLogs(session?.access_token || "", limit),
    staleTime: 10 * 1000, // 10 seconds - pipeline logs change frequently
    enabled: !!session?.access_token,
  });
}

// ─── Genesis Status Hook ───────────────────────────────────────────────────

export function useGenesisStatus() {
  const { session } = useAuth();

  return useQuery({
    queryKey: queryKeys.genesisStatus,
    queryFn: () => fetchGenesisStatus(session?.access_token || ""),
    staleTime: 5 * 1000, // 5 seconds - status changes during pipeline runs
    enabled: !!session?.access_token,
    refetchInterval: 5000, // Poll every 5 seconds when pipeline might be running
  });
}

// ─── User Mutations ────────────────────────────────────────────────────────

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Record<string, unknown> }) =>
      updateUserProfile(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useToggleTempSuspend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, suspend }: { userId: string; suspend: boolean }) =>
      toggleTempSuspend(userId, suspend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useTogglePermSuspend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, suspend }: { userId: string; suspend: boolean }) =>
      togglePermSuspend(userId, suspend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useDeleteUserAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteUserAccount(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: InviteUserParams): Promise<InviteUserResult> =>
      inviteUser(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

// ─── Utility Functions ─────────────────────────────────────────────────────

/**
 * Invalidate all admin queries - use when switching contexts or after major changes
 */
export function useInvalidateAllAdmin() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  };
}

/**
 * Prefetch data for faster navigation
 */
export function usePrefetchOverview() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.overview,
      queryFn: fetchOverviewStats,
    });
  };
}

export function usePrefetchUsers() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users,
      queryFn: fetchUsers,
    });
  };
}