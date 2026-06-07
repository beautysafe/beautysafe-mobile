import { useGroups } from "./useGroups";

export function useGroup() {
  const query = useGroups();

  return {
    ...query,
    groups: query.data ?? [],
    loading: query.isLoading,
  };
}
