import { useQuery } from "@tanstack/react-query";
import { getBannerById, getBanners } from "../api/banner";

export function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    queryFn: getBanners,
  });
}

export function useBannerById(id: number | string) {
  return useQuery({
    queryKey: ["banner", id],
    queryFn: () => getBannerById(id),
    enabled: !!id,
  });
}