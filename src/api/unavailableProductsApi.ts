import { apiFetch } from "./clientApi";

export type UnavailableProductImageFile = {
  uri: string;
  name: string;
  type: string;
};

export type UploadedUnavailableProductImage = {
  url: string;
  storagePath: string;
  filename: string;
  contentType: string;
  size: number;
};

export type SubmitUnavailableProductPayload = {
  imageUrls: string[];
  imageKeys?: string[];
  ean?: string;
  productName?: string;
  brandName?: string;
  notes?: string;
};

export function uploadUnavailableProductImage(
  file: UnavailableProductImageFile,
) {
  const formData = new FormData();

  // React Native accepts a local file descriptor here, although DOM FormData
  // types only declare Blob/string values.
  formData.append(
    "file",
    {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any,
  );

  return apiFetch<UploadedUnavailableProductImage>(
    "/unavailable-products/images",
    {
      method: "POST",
      body: formData,
    },
  );
}

export function submitUnavailableProduct(
  payload: SubmitUnavailableProductPayload,
) {
  return apiFetch("/unavailable-products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
