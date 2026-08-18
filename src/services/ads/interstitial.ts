import {
  getGoogleMobileAdsModule,
  getInterstitialAdUnitId,
  initializeAdMob,
  isAdNoFillError,
} from "./admob";
import type { GoogleMobileAdsModule } from "./admob";

type InterstitialAdInstance = ReturnType<
  GoogleMobileAdsModule["InterstitialAd"]["createForAdRequest"]
>;

const INTERSTITIAL_COOLDOWN_MS = 12_000;
const LOAD_RETRY_DELAY_MS = 30_000;
const PRESENTATION_COMPLETION_TIMEOUT_MS = 60_000;

type ShowInterstitialOptions = {
  waitForClose?: boolean;
};

let interstitial: InterstitialAdInstance | null = null;
let eventUnsubscribers: Array<() => void> = [];
let loadPromise: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let isLoaded = false;
let isLoading = false;
let isShowingInterstitial = false;
let lastInterstitialShownAt = 0;
let presentationCompletionPromise: Promise<void> | null = null;
let resolvePresentationCompletion: (() => void) | null = null;
let presentationCompletionTimer: ReturnType<typeof setTimeout> | null = null;

function logLoadError(error: unknown) {
  if (!__DEV__) {
    return;
  }

  if (isAdNoFillError(error)) {
    console.info("[Ads] interstitial no-fill");
    return;
  }

  console.warn("[Ads] interstitial failed to load", error);
}

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function finishPresentation() {
  if (presentationCompletionTimer) {
    clearTimeout(presentationCompletionTimer);
    presentationCompletionTimer = null;
  }

  const resolve = resolvePresentationCompletion;
  resolvePresentationCompletion = null;
  presentationCompletionPromise = null;
  resolve?.();
}

function beginPresentation(): Promise<void> {
  const completion = new Promise<void>((resolve) => {
    resolvePresentationCompletion = resolve;
  });

  presentationCompletionPromise = completion;
  presentationCompletionTimer = setTimeout(() => {
    if (__DEV__) {
      console.info("[Ads] interstitial close wait timed out");
    }

    finishPresentation();
  }, PRESENTATION_COMPLETION_TIMEOUT_MS);

  return completion;
}

function releaseInterstitial() {
  finishPresentation();
  eventUnsubscribers.forEach((unsubscribe) => unsubscribe());
  eventUnsubscribers = [];
  interstitial = null;
  isLoaded = false;
  isLoading = false;
}

function scheduleLoadRetry() {
  if (retryTimer) {
    return;
  }

  retryTimer = setTimeout(() => {
    retryTimer = null;
    void loadInterstitial();
  }, LOAD_RETRY_DELAY_MS);
}

function createInterstitial(
  adsModule: GoogleMobileAdsModule,
  adUnitId: string,
): InterstitialAdInstance | null {
  try {
    const ad = adsModule.InterstitialAd.createForAdRequest(adUnitId);

    eventUnsubscribers = [
      ad.addAdEventListener(adsModule.AdEventType.LOADED, () => {
        if (interstitial !== ad) {
          return;
        }

        clearRetryTimer();
        isLoading = false;
        isLoaded = true;

        if (__DEV__) {
          console.info("[Ads] interstitial loaded");
        }
      }),
      ad.addAdEventListener(adsModule.AdEventType.ERROR, (error) => {
        if (interstitial !== ad) {
          return;
        }

        isShowingInterstitial = false;
        logLoadError(error);
        releaseInterstitial();
        scheduleLoadRetry();
      }),
      ad.addAdEventListener(adsModule.AdEventType.CLOSED, () => {
        if (interstitial !== ad) {
          return;
        }

        isShowingInterstitial = false;
        releaseInterstitial();
        void loadInterstitial();
      }),
    ];

    return ad;
  } catch (error) {
    if (__DEV__) {
      console.warn("[Ads] interstitial could not be created", error);
    }

    return null;
  }
}

export function loadInterstitial(): Promise<void> {
  if (isLoaded || isLoading || isShowingInterstitial) {
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

    const adUnitId = getInterstitialAdUnitId(
      adsModule.TestIds.INTERSTITIAL,
    );

    if (!adUnitId) {
      return;
    }

    clearRetryTimer();
    interstitial ??= createInterstitial(adsModule, adUnitId);

    if (!interstitial || isLoaded || isLoading || isShowingInterstitial) {
      return;
    }

    try {
      isLoading = true;
      interstitial.load();
    } catch (error) {
      isLoading = false;

      if (__DEV__) {
        console.warn("[Ads] interstitial could not be loaded", error);
      }

      releaseInterstitial();
      scheduleLoadRetry();
    }
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export async function showInterstitialIfReady(
  reason: string,
  options: ShowInterstitialOptions = {},
): Promise<boolean> {
  const isInsideCooldown =
    Date.now() - lastInterstitialShownAt < INTERSTITIAL_COOLDOWN_MS;

  if (isShowingInterstitial) {
    if (__DEV__) {
      console.info("[Ads] interstitial skipped: already-showing");
    }

    if (options.waitForClose && presentationCompletionPromise) {
      await presentationCompletionPromise;
    }

    return false;
  }

  if (isInsideCooldown) {
    if (__DEV__) {
      console.info("[Ads] interstitial skipped: cooldown");
    }

    return false;
  }

  if (!interstitial || !isLoaded || !interstitial.loaded) {
    if (__DEV__) {
      console.info(`[Ads] interstitial not ready: ${reason}`);
    }

    void loadInterstitial();
    return false;
  }

  const activeInterstitial = interstitial;
  const presentationCompletion = beginPresentation();

  try {
    isShowingInterstitial = true;
    isLoaded = false;
    lastInterstitialShownAt = Date.now();
    await activeInterstitial.show();

    if (__DEV__) {
      console.info(`[Ads] interstitial shown: ${reason}`);
    }

    if (options.waitForClose) {
      await presentationCompletion;
    }

    return true;
  } catch (error) {
    isShowingInterstitial = false;

    if (__DEV__) {
      console.warn("[Ads] interstitial could not be shown", error);
    }

    releaseInterstitial();
    scheduleLoadRetry();
    return false;
  }
}

/** Backwards-compatible low-level API. Prefer an ad-session safe transition. */
export function showInterstitial(): Promise<boolean> {
  return showInterstitialIfReady("legacy-call");
}

/**
 * Backwards compatibility for older callers. Typed EAN lookups no longer
 * change the camera-scan counter; they only provide a safe time-ad checkpoint.
 */
export async function recordSuccessfulEanSearch(): Promise<boolean> {
  const { recordSuccessfulEanSearch: recordSafeTransition } = await import(
    "./ad-session"
  );

  return recordSafeTransition();
}
