// src/api/cloudinary.ts
import * as FileSystem from "expo-file-system";

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

type UploadResult = {
  secure_url: string;
  public_id: string;
};

export async function uploadToCloudinary(imageUri: string): Promise<UploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary env vars missing (CLOUD_NAME / UPLOAD_PRESET)");
  }

  // ensure uri is accessible
  const info = await FileSystem.getInfoAsync(imageUri);
  if (!info.exists) throw new Error("Image file not found");

  const form = new FormData();
  form.append("file", {
    uri: imageUri,
    name: "avatar.jpg",
    type: "image/jpeg",
  } as any);

  form.append("upload_preset", UPLOAD_PRESET);
  // optional:
  // form.append("folder", "avatars");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
    // DO NOT set Content-Type manually for FormData in React Native
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || "Cloudinary upload failed");
  }

  return {
    secure_url: json.secure_url,
    public_id: json.public_id,
  };
}
