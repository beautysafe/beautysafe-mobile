import { Platform } from "react-native";

export type GoogleMobileAdsModule =
  typeof import("react-native-google-mobile-ads");

const productionBannerAdUnitId =
  process.env.EXPO_PUBLIC_ADMOB_BANNER_ID?.trim() || null;

const productionInterstitialAdUnitId =
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID?.trim() || null;

/**
 * IMPORTANT:
 *
 * Start disabled.
 *
 * AuthProvider will enable ads only after it knows:
 *
 * - there is no logged-in user
 * OR
 * - the logged-in user has vip !== true
 *
 * This prevents a VIP user from briefly receiving an ad while
 * /users/me is still loading during application startup.
 */
let adsEnabled = false;

const adsEnabledListeners = new Set<
  (enabled: boolean) => void
>();

let adsModulePromise:
  | Promise<GoogleMobileAdsModule | null>
  | null = null;

let initializationPromise:
  | Promise<boolean>
  | null = null;

let warnedAboutBannerId = false;
let warnedAboutInterstitialId = false;

function warn(
  message: string,
  error?: unknown,
) {
  if (__DEV__) {
    console.warn(
      message,
      error ?? "",
    );
  }
}

export function areAdsEnabled(): boolean {
  return adsEnabled;
}

export function setAdsEnabled(
  enabled: boolean,
) {
  if (adsEnabled === enabled) {
    return;
  }

  adsEnabled = enabled;

  if (__DEV__) {
    console.info(
      `[Ads] advertisements ${
        enabled ? "enabled" : "disabled"
      }`,
    );
  }

  adsEnabledListeners.forEach(
    (listener) => {
      try {
        listener(enabled);
      } catch (error) {
        if (__DEV__) {
          console.warn(
            "[Ads] ads-enabled listener failed",
            error,
          );
        }
      }
    },
  );
}

export function subscribeToAdsEnabled(
  listener: (
    enabled: boolean,
  ) => void,
): () => void {
  adsEnabledListeners.add(
    listener,
  );

  // Immediately provide current state.
  listener(adsEnabled);

  return () => {
    adsEnabledListeners.delete(
      listener,
    );
  };
}

export function isAdNoFillError(
  error: unknown,
): boolean {
  const code = String(
    (
      error as {
        code?: unknown;
      } | null
    )?.code ?? "",
  ).toLowerCase();

  const message = String(
    (
      error as {
        message?: unknown;
      } | null
    )?.message ?? "",
  ).toLowerCase();

  return (
    code.includes("no-fill") ||
    code.includes("no_fill") ||
    message.includes("no fill")
  );
}

export function getGoogleMobileAdsModule():
  Promise<GoogleMobileAdsModule | null> {
  if (
    Platform.OS === "web" ||
    !adsEnabled
  ) {
    return Promise.resolve(null);
  }

  if (!adsModulePromise) {
    adsModulePromise = import(
      "react-native-google-mobile-ads"
    ).catch((error) => {
      warn(
        "Google Mobile Ads is unavailable in this build.",
        error,
      );

      return null;
    });
  }

  return adsModulePromise;
}

export function getBannerAdUnitId(
  testId: string,
): string | null {
  if (!adsEnabled) {
    return null;
  }

  if (__DEV__) {
    return testId;
  }

  if (
    !productionBannerAdUnitId &&
    !warnedAboutBannerId
  ) {
    warnedAboutBannerId = true;

    warn(
      "EXPO_PUBLIC_ADMOB_BANNER_ID is missing; banner ads are disabled.",
    );
  }

  return productionBannerAdUnitId;
}

export function getInterstitialAdUnitId(
  testId: string,
): string | null {
  if (!adsEnabled) {
    return null;
  }

  if (__DEV__) {
    return testId;
  }

  if (
    !productionInterstitialAdUnitId &&
    !warnedAboutInterstitialId
  ) {
    warnedAboutInterstitialId =
      true;

    warn(
      "EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID is missing; interstitial ads are disabled.",
    );
  }

  return productionInterstitialAdUnitId;
}

export function initializeAdMob():
  Promise<boolean> {
  if (!adsEnabled) {
    return Promise.resolve(false);
  }

  if (!initializationPromise) {
    initializationPromise =
      (async () => {
        const adsModule =
          await getGoogleMobileAdsModule();

        if (!adsModule) {
          return false;
        }

        try {
          await adsModule
            .default()
            .initialize();

          return true;
        } catch (error) {
          warn(
            "Google Mobile Ads failed to initialize.",
            error,
          );

          return false;
        }
      })();
  }

  return initializationPromise;
}