import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";

const KEY = "hasOnboarded";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Index() {
  const [ready, setReady] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(KEY);
        setHasOnboarded(v === "1");
      } finally {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!ready || hasOnboarded === null) return null;

  // first launch => onboarding, else => main
  return hasOnboarded ? <Redirect href="/(main)" /> : <Redirect href="/(onboarding)/onboarding" />;
}
