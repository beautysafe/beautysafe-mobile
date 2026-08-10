import {
  getGoogleMobileAdsModule,
  getInterstitialAdUnitId,
  initializeAdMob,
} from "./admob";
import type { GoogleMobileAdsModule } from "./admob";

export const SEARCHES_BEFORE_INTERSTITIAL = 2;

type InterstitialAdInstance = ReturnType<
  GoogleMobileAdsModule["InterstitialAd"]["createForAdRequest"]
>;

let interstitial: InterstitialAdInstance | null = null;
let loadPromise: Promise<void> | null = null;
let isLoading = false;
let isShowing = false;
let successfulSearchCount = 0;

function warn(message: string, error?: unknown) {
  if (__DEV__) {
    console.warn(message, error ?? "");
  }
}

function createInterstitial(
  adsModule: GoogleMobileAdsModule,
  adUnitId: string,
): InterstitialAdInstance | null {
  try {
    const ad = adsModule.InterstitialAd.createForAdRequest(adUnitId);

    ad.addAdEventListener(adsModule.AdEventType.LOADED, () => {
      isLoading = false;
    });
    ad.addAdEventListener(adsModule.AdEventType.ERROR, (error) => {
      isLoading = false;
      isShowing = false;
      warn("The interstitial ad failed to load.", error);
    });
    ad.addAdEventListener(adsModule.AdEventType.CLOSED, () => {
      isLoading = false;
      isShowing = false;
      void loadInterstitial();
    });

    return ad;
  } catch (error) {
    warn("The interstitial ad could not be created.", error);
    return null;
  }
}

export function loadInterstitial(): Promise<void> {
  if (interstitial?.loaded || isLoading || isShowing) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const initialized = await initializeAdMob();

    if (!initialized) {
      return;
    }

    const adsModule = await getGoogleMobileAdsModule();

    if (!adsModule) {
      return;
    }

    const adUnitId = getInterstitialAdUnitId(adsModule.TestIds.INTERSTITIAL);

    if (!adUnitId) {
      return;
    }

    interstitial ??= createInterstitial(adsModule, adUnitId);

    if (!interstitial || interstitial.loaded || isLoading || isShowing) {
      return;
    }

    try {
      isLoading = true;
      interstitial.load();
    } catch (error) {
      isLoading = false;
      warn("The interstitial ad could not be loaded.", error);
    }
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export async function showInterstitial(): Promise<boolean> {
  if (!interstitial?.loaded || isShowing) {
    void loadInterstitial();
    return false;
  }

  try {
    isShowing = true;
    await interstitial.show();
    return true;
  } catch (error) {
    isShowing = false;
    warn("The interstitial ad could not be shown.", error);
    return false;
  }
}

export function recordSuccessfulEanSearch() {
  successfulSearchCount += 1;

  if (successfulSearchCount < SEARCHES_BEFORE_INTERSTITIAL) {
    return;
  }

  successfulSearchCount = 0;
  void showInterstitial();
}
