import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { getMyScans, getMyScanStats, recordScan } from "../api/scansApi";

export const scanKeys = {
  root: ["me", "scans"] as const,
  lists: ["me", "scans", "list"] as const,
  list: (page: number, limit: number) =>
    [...scanKeys.lists, page, limit] as const,
  stats: ["me", "scans", "stats"] as const,
};

export function useMyScans(page: number, limit: number, enabled: boolean) {
  return useQuery({
    queryKey: scanKeys.list(page, limit),
    queryFn: () => getMyScans(page, limit),
    enabled,
    staleTime: 15_000,
    retry: (failureCount, error: unknown) =>
      (error as { status?: number })?.status !== 401 && failureCount < 2,
  });
}

export function useMyScanStats(enabled: boolean) {
  return useQuery({
    queryKey: scanKeys.stats,
    queryFn: getMyScanStats,
    enabled,
    staleTime: 15_000,
    retry: (failureCount, error: unknown) =>
      (error as { status?: number })?.status !== 401 && failureCount < 2,
  });
}

export function useInfiniteMyScans(enabled: boolean, limit = 20) {
  return useInfiniteQuery({
    queryKey: [...scanKeys.lists, "infinite", limit],
    queryFn: ({ pageParam }) => getMyScans(pageParam, limit),
    initialPageParam: 1,
    enabled,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    retry: (failureCount, error: unknown) =>
      (error as { status?: number })?.status !== 401 && failureCount < 2,
  });
}

export function useRecordScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: number) => recordScan(productId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: scanKeys.lists }),
        queryClient.invalidateQueries({ queryKey: scanKeys.stats }),
      ]);
    },
  });
}
