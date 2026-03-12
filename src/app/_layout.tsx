// src/app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "../components/AuthProvider";

const queryClient = new QueryClient();
const ONBOARD_KEY = "hasOnboarded";

function Guard() {
  const { token, loading } = useAuth();
  const segments = useSegments() as unknown as string[];;
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const hasOnboarded = await AsyncStorage.getItem(ONBOARD_KEY);

      // 1) Onboarding gate only
      if (!hasOnboarded) {
        if (segments[0] !== "(onboarding)") {
          router.replace("/(onboarding)/onboarding");
        }
        return;
      }

      if (loading) return;

      // 2) If logged-in and user is on auth pages => send to main home

      const inTabs = segments[0] === "(tabs)";
      const inAuth = inTabs && segments[1] === "(auth)";

      if (token && inAuth) {
        router.replace("/(tabs)/(main)");
      }
    })();
  }, [segments, token, loading]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Guard />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
