import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOKEN_KEY } from "../api/clientApi";
import * as authApi from "../api/authApi";

type User = any;

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (dto: authApi.RegisterDto) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch (error: any) {
      if (
        error?.status === 401 ||
        error?.message?.includes("401") ||
        error?.message?.toLowerCase?.includes("unauthorized")
      ) {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } else {
        console.log("refreshMe failed, token preserved:", error?.message);
      }
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(storedToken);

        if (storedToken) {
          await refreshMe();
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const t = res?.access_token || res?.token || res?.accessToken || res?.jwt;

    if (!t) throw new Error("Token not returned by API");

    await AsyncStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    await refreshMe();
  };

  const signUp = async (dto: authApi.RegisterDto) => {
    const res = await authApi.register(dto);
    const t = res?.access_token || res?.token || res?.accessToken || res?.jwt;

    if (t) {
      await AsyncStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      await refreshMe();
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, loading, signIn, signUp, signOut, refreshMe }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}