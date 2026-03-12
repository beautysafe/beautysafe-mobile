const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.beautysafe.online";

/** Get product by EAN */
export async function getProductByEan(ean: string) {
  const res = await fetch(`${API_BASE_URL}/products/ean/${ean}`);
  if (!res.ok) throw new Error("Produit non trouvé");
  return await res.json();
}

export async function getProductsByFlag(id: number, page = 1, limit = 5) {
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.beautysafe.online";
  const url = `${API_BASE_URL}/products/flag/${id}?page=${page}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur lors du chargement des produits");
  return await res.json();
}

/** Advanced Search */
export type ProductSearchParams = {
  page?: number;
  limit?: number;

  brandIds?: number[]; // comma-separated in query
  categoryIds?: number[];
  subCategoryIds?: number[];
  subSubCategoryIds?: number[];

  includeIngredientIds?: number[]; // OR logic
  excludeIngredientIds?: number[];

  flagIds?: number[]; // OR logic

  minScore?: number;
  maxScore?: number;
};

function addIds(params: URLSearchParams, key: string, ids?: number[]) {
  if (!ids?.length) return;
  params.set(key, ids.join(","));
}

export async function searchProducts(paramsInput: ProductSearchParams) {
  const params = new URLSearchParams();

  // pagination
  params.set("page", String(paramsInput.page ?? 1));
  params.set("limit", String(paramsInput.limit ?? 10));

  // ids
  addIds(params, "brandIds", paramsInput.brandIds);
  addIds(params, "categoryIds", paramsInput.categoryIds);
  addIds(params, "subCategoryIds", paramsInput.subCategoryIds);
  addIds(params, "subSubCategoryIds", paramsInput.subSubCategoryIds);

  addIds(params, "includeIngredientIds", paramsInput.includeIngredientIds);
  addIds(params, "excludeIngredientIds", paramsInput.excludeIngredientIds);

  addIds(params, "flagIds", paramsInput.flagIds);

  // score range
  if (paramsInput.minScore !== undefined)
    params.set("minScore", String(paramsInput.minScore));
  if (paramsInput.maxScore !== undefined)
    params.set("maxScore", String(paramsInput.maxScore));

  const url = `${API_BASE_URL}/products/search?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Erreur lors de la recherche");
  }
  return await res.json();
}