import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMyFavorite, getMyFavorites, removeMyFavorite } from "../api/favoriteApi";

type FavoriteItem = { uid?: number; productUid?: number; [k: string]: any };

function normalizeArray(res: any): FavoriteItem[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  return [];
}

export function useFavoritesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: getMyFavorites,
    enabled,
  });
}

export function useToggleFavorite(enabled: boolean, productUid?: number) {
  const qc = useQueryClient();

  const favQuery = useFavoritesQuery(enabled);

  const list = normalizeArray(favQuery.data);
  const isFav =
    !!productUid &&
    list.some((f) => (f.productUid ?? f.uid) === productUid);

  const addMut = useMutation({
    mutationFn: (uid: number) => addMyFavorite(uid),
    onMutate: async (uid) => {
      await qc.cancelQueries({ queryKey: ["favorites"] });
      const prev = qc.getQueryData(["favorites"]);
      // optimistic: append minimal item
      qc.setQueryData(["favorites"], (old: any) => {
        const arr = normalizeArray(old);
        const already = arr.some((f) => (f.productUid ?? f.uid) === uid);
        const next = already ? arr : [{ productUid: uid }, ...arr];
        // keep same shape (array vs {data})
        return Array.isArray(old) ? next : { ...(old || {}), data: next };
      });
      return { prev };
    },
    onError: (_e, _uid, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favorites"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const delMut = useMutation({
    mutationFn: (uid: number) => removeMyFavorite(uid),
    onMutate: async (uid) => {
      await qc.cancelQueries({ queryKey: ["favorites"] });
      const prev = qc.getQueryData(["favorites"]);
      qc.setQueryData(["favorites"], (old: any) => {
        const arr = normalizeArray(old).filter((f) => (f.productUid ?? f.uid) !== uid);
        return Array.isArray(old) ? arr : { ...(old || {}), data: arr };
      });
      return { prev };
    },
    onError: (_e, _uid, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favorites"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const toggle = async () => {
    if (!productUid) return;
    if (isFav) await delMut.mutateAsync(productUid);
    else await addMut.mutateAsync(productUid);
  };

  return {
    favorites: list,
    isFav,
    toggle,
    loading: favQuery.isLoading || addMut.isPending || delMut.isPending,
  };
}
