import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteMyProductFeedback,
  getMyProductFeedback,
  getProductFeedbackSummary,
  ProductFeedbackPayload,
  submitProductFeedback,
} from "../api/feedbackApi";

export const productFeedbackKeys = {
  root: ["productFeedback"] as const,
  mine: (productId: number) =>
    [...productFeedbackKeys.root, productId, "me"] as const,
  summary: (productId: number) =>
    [...productFeedbackKeys.root, productId, "summary"] as const,
};

type UseProductFeedbackOptions = {
  productId?: number;
  ean?: string;
  authenticated: boolean;
};

export function useProductFeedback({
  productId,
  ean,
  authenticated,
}: UseProductFeedbackOptions) {
  const queryClient = useQueryClient();
  const validProductId = typeof productId === "number" ? productId : 0;

  const myFeedbackQuery = useQuery({
    queryKey: productFeedbackKeys.mine(validProductId),
    queryFn: () => getMyProductFeedback(validProductId),
    enabled: authenticated && validProductId > 0,
    staleTime: 30_000,
    retry: (failureCount, error: unknown) =>
      (error as { status?: number })?.status !== 401 && failureCount < 2,
  });

  const summaryQuery = useQuery({
    queryKey: productFeedbackKeys.summary(validProductId),
    queryFn: () => getProductFeedbackSummary(validProductId),
    enabled: validProductId > 0,
    staleTime: 30_000,
  });

  const invalidateFeedbackQueries = async () => {
    const invalidations = [
      queryClient.invalidateQueries({
        queryKey: productFeedbackKeys.mine(validProductId),
      }),
      queryClient.invalidateQueries({
        queryKey: productFeedbackKeys.summary(validProductId),
      }),
    ];

    if (ean) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ["productByEan", ean],
        }),
      );
    }

    await Promise.all(invalidations);
  };

  const submitMutation = useMutation({
    mutationFn: (payload: ProductFeedbackPayload) => {
      if (!validProductId) {
        throw new Error("Product identifier is missing");
      }

      return submitProductFeedback(validProductId, payload);
    },
    onSuccess: invalidateFeedbackQueries,
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!validProductId) {
        throw new Error("Product identifier is missing");
      }

      return deleteMyProductFeedback(validProductId);
    },
    onSuccess: invalidateFeedbackQueries,
  });

  return {
    myFeedbackQuery,
    summaryQuery,
    submitFeedback: submitMutation.mutateAsync,
    deleteFeedback: deleteMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
