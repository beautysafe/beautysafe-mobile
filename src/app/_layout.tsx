// src/app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "../components/AuthProvider";
import { runDevelopmentApiConnectivityCheck } from "../api/clientApi";
import { initializeAdMob } from "../services/ads/admob";
import { loadInterstitial } from "../services/ads/interstitial";
import {
  runDevelopmentAdPolicyChecks,
  startActiveUsageTracking,
} from "../services/ads/ad-session";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.code === "API_TIMEOUT") return false;
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 3;
      },
    },
  },
});
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
  useEffect(() => {
    void runDevelopmentApiConnectivityCheck();
  }, []);

  useEffect(() => {
    runDevelopmentAdPolicyChecks();
    return startActiveUsageTracking();
  }, []);

  useEffect(() => {
    void initializeAdMob().then((initialized) => {
      if (initialized) {
        void loadInterstitial();
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Guard />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
