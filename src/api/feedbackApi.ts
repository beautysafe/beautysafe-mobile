import { apiFetch, publicApiFetch } from "./clientApi";

export type ProductFeedbackPayload = {
  effectivenessRating: number;
  needsRating: number;
  repurchaseRating: number;
  comment?: string;
};

export type ProductFeedback = ProductFeedbackPayload & {
  id?: number;
  productId?: number;
  comment?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductFeedbackSummary = {
  averageRating: number;
  ratingsCount: number;
  effectivenessAverage?: number;
  needsAverage?: number;
  repurchaseAverage?: number;
};

export async function getMyProductFeedback(
  productId: number,
): Promise<ProductFeedback | null> {
  try {
    return await apiFetch<ProductFeedback>(
      `/products/${productId}/feedback/me`,
      { method: "GET" },
    );
  } catch (error: unknown) {
    if ((error as { status?: number })?.status === 404) {
      return null;
    }

    throw error;
  }
}

export function submitProductFeedback(
  productId: number,
  payload: ProductFeedbackPayload,
) {
  return apiFetch<ProductFeedback>(`/products/${productId}/feedback`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getProductFeedbackSummary(productId: number) {
  return publicApiFetch<ProductFeedbackSummary>(
    `/products/${productId}/feedback/summary`,
    { method: "GET" },
  );
}

export function deleteMyProductFeedback(productId: number) {
  return apiFetch(`/products/${productId}/feedback/me`, {
    method: "DELETE",
  });
}
