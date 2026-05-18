import { Banner } from "../types/product";
import { apiFetch } from "./clientApi";

export async function getBanners(): Promise<Banner[]> {
  return apiFetch("/banners", { method: "GET" });
}

export async function getBannerById(id: number | string): Promise<Banner> {
  return apiFetch(`/banners/${id}`, { method: "GET" });
}