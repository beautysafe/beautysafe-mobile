import { publicApiFetch } from "./clientApi";

/** Get product by EAN */
export async function getProductByEan(ean: string) {
  try {
    return await publicApiFetch(`/products/ean/${ean}`, { method: "GET" });
  } catch (error: any) {
    if (error?.status === 404) error.message = "Produit non trouvé";
    throw error;
  }
}

export async function getProductsByFlag(id: number, page = 1, limit = 5) {
  try {
    return await publicApiFetch(
      `/products/flag/${id}?page=${page}&limit=${limit}`,
      { method: "GET" }
    );
  } catch (error: any) {
    if (error?.status === 404) {
      error.message = "Erreur lors du chargement des produits";
    }
    throw error;
  }
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

  return publicApiFetch(`/products/search?${params.toString()}`, {
    method: "GET",
  });
}
