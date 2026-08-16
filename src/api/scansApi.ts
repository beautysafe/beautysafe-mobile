import { apiFetch } from "./clientApi";

export type ScanProduct = {
  uid: number;
  ean: string;
  name: string;
  brand: {
    id: number;
    name: string;
  };
  image?: string | null;
};

export type ScanEvent = {
  id: number;
  scannedAt: string;
  product: ScanProduct;
};

export type MyScansResponse = {
  items: ScanEvent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  totalScans: number;
};

export type MyScanStats = {
  totalScans: number;
  uniqueProducts: number;
};

export function recordScan(productId: number) {
  return apiFetch("/scans", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export function getMyScans(page = 1, limit = 20) {
  return apiFetch<MyScansResponse>(
    `/users/me/scans?page=${page}&limit=${limit}`,
    { method: "GET" },
  );
}

export function getMyScanStats() {
  return apiFetch<MyScanStats>("/users/me/scans/stats", {
    method: "GET",
  });
}
