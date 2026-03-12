import { useQuery } from "@tanstack/react-query";
import { getProductByEan, getProductsByFlag, ProductSearchParams, searchProducts } from "../api/productApi";
import { useInfiniteQuery } from "@tanstack/react-query";

// For single product by EAN
export function useProductByEan(ean: string, options = {}) {
  return useQuery({
    queryKey: ["productByEan", ean],
    queryFn: () => getProductByEan(ean),
    enabled: !!ean,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    ...options,
  });
}

// For flagged products by category
export function useProductsByFlag(flagId: number, options = {}) {
  return useQuery({
    queryKey: ["flaggedProducts", flagId],
    queryFn: () => getProductsByFlag(flagId, 1, 5),
    enabled: !!flagId,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    ...options,
  });
}
export function useProductsByFlagInfinite(
  flagId: number,
  enabled = true,
  limit = 10
) {
  return useInfiniteQuery({
    queryKey: ["flaggedProductsInfinite", flagId],
    enabled: enabled && !!flagId,
    initialPageParam: 1,

    queryFn: async ({ pageParam }) => {
      // this uses YOUR existing API function
      return getProductsByFlag(flagId, pageParam, limit);
    },

    getNextPageParam: (lastPage, allPages) => {
      const length = lastPage?.data?.length ?? 0;

      // if backend returns fewer than limit, no more pages
      if (length < limit) return undefined;

      return allPages.length + 1;
    },
  });
}


/** Advanced search (infinite) */
export function useProductsSearchInfinite(
  filters: Omit<ProductSearchParams, "page">,
  enabled = true
) {
  const limit = filters.limit ?? 10;

  return useInfiniteQuery({
    queryKey: ["productsSearchInfinite", filters],
    enabled,
    initialPageParam: 1,

    queryFn: ({ pageParam }) =>
      searchProducts({
        ...filters,
        page: pageParam,
        limit,
      }),

    getNextPageParam: (lastPage) => {
      // backend provides hasMore + page
      if (lastPage?.hasMore) return (lastPage.page ?? 1) + 1;

      // fallback: if missing hasMore, infer from length
      const length = lastPage?.data?.length ?? 0;
      if (length < limit) return undefined;
      return (lastPage?.page ?? 1) + 1;
    },
  });
}