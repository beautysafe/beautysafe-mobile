import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://beautysafe-monorepo.onrender.com";

export const TOKEN_KEY = "token";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const error: any = new Error(
      json?.message ||
        json?.error ||
        (Array.isArray(json) ? json.join(", ") : "") ||
        `HTTP ${res.status}`
    );

    error.status = res.status;
    error.data = json;

    throw error;
  }

  return json;
}