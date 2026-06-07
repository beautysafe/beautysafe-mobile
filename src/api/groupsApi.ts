import type {
  Group,
  Journey,
  ProductListProductsResponse,
  SubGroup,
} from "../types/group";
import type { Product } from "../types/product";
import { apiFetch } from "./clientApi";

function normalizeArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.subgroups)) return value.subgroups;
  return [];
}

export async function getGroups(): Promise<Group[]> {
  const res = await apiFetch("/groups", { method: "GET" });
  return normalizeArray<Group>(res);
}

export async function getGroupById(id: number | string): Promise<Group> {
  return apiFetch(`/groups/${id}`, { method: "GET" });
}

export async function getGroupSubGroups(id: number | string): Promise<SubGroup[]> {
  const res = await apiFetch(`/groups/${id}/subgroups`, { method: "GET" });
  return normalizeArray<SubGroup>(res);
}

export async function getSubGroupById(id: number | string): Promise<SubGroup> {
  return apiFetch(`/subgroups/${id}`, { method: "GET" });
}

export async function getJourneyById(id: number | string): Promise<Journey> {
  return apiFetch(`/journeys/${id}`, { method: "GET" });
}

export async function getProductListProducts(
  id: number | string,
  page = 1,
  limit = 20
): Promise<ProductListProductsResponse> {
  const res = await apiFetch(`/product-lists/${id}/products?page=${page}&limit=${limit}`, {
    method: "GET",
  });

  const products = normalizeArray<Product>(res);
  const meta = res?.meta ?? res?.pagination ?? res;

  return {
    products,
    page: Number(meta?.page ?? page),
    limit: Number(meta?.limit ?? limit),
    total: meta?.total ?? meta?.totalItems,
    totalPages: meta?.totalPages,
    hasMore:
      typeof meta?.hasMore === "boolean"
        ? meta.hasMore
        : products.length >= limit &&
          (meta?.totalPages ? Number(meta?.page ?? page) < Number(meta.totalPages) : true),
  };
}
