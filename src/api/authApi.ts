import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, TOKEN_KEY } from "./clientApi";

export type LoginDto = { email: string; password: string };
export type RegisterDto = {
  email: string;
  password: string;
  birthday?: string; // can be optional if you want
  skinType?: string;
  hairType?: string;
  phoneNumber?: string;
  address?: string;
};

export async function login(dto: LoginDto) {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(dto),
  });

  const token =
    res?.access_token || res?.accessToken || res?.token || res?.jwt;

  if (!token) throw new Error("Token not found in login response");

  await AsyncStorage.setItem(TOKEN_KEY, token);
  return res;
}

export async function register(dto: RegisterDto) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function getMe() {
  return apiFetch("/users/me");
}

export async function logout() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
