import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  getGroupById,
  getGroups,
  getGroupSubGroups,
  getJourneyById,
  getProductListProducts,
  getSubGroupById,
} from "../api/groupsApi";

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: getGroups,
  });
}

export function useGroupById(id?: number | string) {
  return useQuery({
    queryKey: ["group", id],
    queryFn: () => getGroupById(id as number | string),
    enabled: !!id,
  });
}

export function useGroupSubGroups(id?: number | string) {
  return useQuery({
    queryKey: ["groupSubgroups", id],
    queryFn: () => getGroupSubGroups(id as number | string),
    enabled: !!id,
  });
}

export function useSubGroupById(id?: number | string) {
  return useQuery({
    queryKey: ["subgroup", id],
    queryFn: () => getSubGroupById(id as number | string),
    enabled: !!id,
  });
}

export function useJourneyById(id?: number | string) {
  return useQuery({
    queryKey: ["journey", id],
    queryFn: () => getJourneyById(id as number | string),
    enabled: !!id,
  });
}

export function useProductListProductsInfinite(
  id?: number | string,
  enabled = true,
  limit = 20,
  startPage = 1
) {
  return useInfiniteQuery({
    queryKey: [
      "productListProducts",
      id,
      limit,
      startPage,
    ],

    enabled:
      enabled &&
      !!id &&
      startPage >= 1,

    initialPageParam: startPage,

    queryFn: ({ pageParam }) =>
      getProductListProducts(
        id as number | string,
        Number(pageParam),
        limit
      ),

    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore === false) {
        return undefined;
      }

      if (
        lastPage.totalPages &&
        lastPage.page &&
        lastPage.page < lastPage.totalPages
      ) {
        return lastPage.page + 1;
      }

      if (
        (lastPage.products?.length ?? 0) < limit
      ) {
        return undefined;
      }

      return (lastPage.page ?? startPage) + 1;
    },
  });
}
