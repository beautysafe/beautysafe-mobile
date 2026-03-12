// src/hooks/useFavorites.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMyFavorite, getMyFavorites, removeMyFavorite } from "../api/favoriteApi";

const FAVORITES_KEY = ["me", "favorites"] as const;

type FavoriteItem = { uid?: number; productUid?: number; [k: string]: any };

function normalizeArray(res: any): FavoriteItem[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  return [];
}

function getId(item: FavoriteItem): number | undefined {
  const v = item.productUid ?? item.uid;
  return typeof v === "number" ? v : undefined;
}

/**
 * Single source of truth for Favorites:
 * - Query favorites
 * - Mutations add/remove/toggle with optimistic updates
 */
export function useFavorites(enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: getMyFavorites,
    enabled,
    staleTime: 30_000,
  });

  const favorites = normalizeArray(query.data);

  const addMut = useMutation({
    mutationFn: (productUid: number) => addMyFavorite(productUid),
    onMutate: async (productUid) => {
      await qc.cancelQueries({ queryKey: FAVORITES_KEY });

      const prev = qc.getQueryData(FAVORITES_KEY);

      qc.setQueryData(FAVORITES_KEY, (old: any) => {
        const arr = normalizeArray(old);

        const already = arr.some((f) => getId(f) === productUid);
        const next = already ? arr : [{ productUid }, ...arr];

        // preserve old shape (array vs object with data)
        return Array.isArray(old) ? next : { ...(old || {}), data: next };
      });

      return { prev };
    },
    onError: (_e, _uid, ctx) => {
      if (ctx?.prev) qc.setQueryData(FAVORITES_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });

  const removeMut = useMutation({
    mutationFn: (productUid: number) => removeMyFavorite(productUid),
    onMutate: async (productUid) => {
      await qc.cancelQueries({ queryKey: FAVORITES_KEY });

      const prev = qc.getQueryData(FAVORITES_KEY);

      qc.setQueryData(FAVORITES_KEY, (old: any) => {
        const arr = normalizeArray(old).filter((f) => getId(f) !== productUid);
        return Array.isArray(old) ? arr : { ...(old || {}), data: arr };
      });

      return { prev };
    },
    onError: (_e, _uid, ctx) => {
      if (ctx?.prev) qc.setQueryData(FAVORITES_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });

  const isFavorite = (productUid?: number) => {
    if (!productUid) return false;
    return favorites.some((f) => getId(f) === productUid);
  };

  const addFavorite = async (productUid: number) => {
    await addMut.mutateAsync(productUid);
  };

  const removeFavorite = async (productUid: number) => {
    await removeMut.mutateAsync(productUid);
  };

  const toggleFavorite = async (productUid: number) => {
    if (isFavorite(productUid)) await removeFavorite(productUid);
    else await addFavorite(productUid);
  };

  return {
    // data
    favorites,
    isFavorite,

    // actions
    addFavorite,
    removeFavorite,
    toggleFavorite,

    // query state
    refetch: query.refetch,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // mutation state
    isMutating: addMut.isPending || removeMut.isPending,
  };
}
