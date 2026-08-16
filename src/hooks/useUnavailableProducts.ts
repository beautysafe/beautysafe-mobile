import { useMutation } from "@tanstack/react-query";

import {
  submitUnavailableProduct,
  UnavailableProductImageFile,
  uploadUnavailableProductImage,
} from "../api/unavailableProductsApi";

export type SubmitUnavailableProductInput = {
  images: UnavailableProductImageFile[];
  ean?: string;
  notes?: string;
};

export class UnavailableImageUploadError extends Error {
  imageNumber: number;
  status?: number;
  code?: string;

  constructor(imageNumber: number, cause: unknown) {
    super("Unavailable product image upload failed");
    this.name = "UnavailableImageUploadError";
    this.imageNumber = imageNumber;
    this.status = (cause as { status?: number })?.status;
    this.code = (cause as { code?: string })?.code;
  }
}

export function useUnavailableProducts() {
  const submitMutation = useMutation({
    mutationFn: async ({
      images,
      ean,
      notes,
    }: SubmitUnavailableProductInput) => {
      if (images.length < 1 || images.length > 10) {
        throw new Error("Invalid image count");
      }

      const uploads = [];

      for (let index = 0; index < images.length; index += 1) {
        try {
          uploads.push(await uploadUnavailableProductImage(images[index]));
        } catch (error: unknown) {
          throw new UnavailableImageUploadError(index + 1, error);
        }
      }

      return submitUnavailableProduct({
        ean: ean?.trim() || undefined,
        notes: notes?.trim() || undefined,
        imageUrls: uploads.map((upload) => upload.url),
        imageKeys: uploads.map((upload) => upload.storagePath),
      });
    },
  });

  return {
    submitUnavailableProduct: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    error: submitMutation.error,
    reset: submitMutation.reset,
  };
}
