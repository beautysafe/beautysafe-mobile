import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOKEN_KEY } from "../api/clientApi"
export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Run on mount to check for token
  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then(token => {
      setIsLoggedIn(!!token);
      setLoading(false);
    });
  }, []);

  // Login handler
  const login = useCallback(async (token: string) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setIsLoggedIn(true);
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setIsLoggedIn(false);
  }, []);

  return { isLoggedIn, loading, login, logout };
}
