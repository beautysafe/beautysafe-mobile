import {
  areAdsEnabled,
  getGoogleMobileAdsModule,
  getInterstitialAdUnitId,
  initializeAdMob,
  isAdNoFillError,
  subscribeToAdsEnabled,
} from "./admob";

import type {
  GoogleMobileAdsModule,
} from "./admob";

type InterstitialAdInstance =
  ReturnType<
    GoogleMobileAdsModule["InterstitialAd"]["createForAdRequest"]
  >;

const INTERSTITIAL_COOLDOWN_MS =
  12_000;

const LOAD_RETRY_DELAY_MS =
  30_000;

const PRESENTATION_COMPLETION_TIMEOUT_MS =
  60_000;

type ShowInterstitialOptions = {
  waitForClose?: boolean;
};

let interstitial:
  | InterstitialAdInstance
  | null = null;

let eventUnsubscribers:
  Array<() => void> = [];

let loadPromise:
  | Promise<void>
  | null = null;

let retryTimer:
  | ReturnType<typeof setTimeout>
  | null = null;

let isLoaded = false;
let isLoading = false;
let isShowingInterstitial = false;

let lastInterstitialShownAt =
  0;

let presentationCompletionPromise:
  | Promise<void>
  | null = null;

let resolvePresentationCompletion:
  | (() => void)
  | null = null;

let presentationCompletionTimer:
  | ReturnType<typeof setTimeout>
  | null = null;

/**
 * Logs interstitial loading errors only
 * in development.
 */
function logLoadError(
  error: unknown,
) {
  if (!__DEV__) {
    return;
  }

  if (
    isAdNoFillError(
      error,
    )
  ) {
    console.info(
      "[Ads] interstitial no-fill",
    );

    return;
  }

  console.warn(
    "[Ads] interstitial failed to load",
    error,
  );
}

/**
 * Clears scheduled retry.
 */
function clearRetryTimer() {
  if (!retryTimer) {
    return;
  }

  clearTimeout(
    retryTimer,
  );

  retryTimer =
    null;
}

/**
 * Resolves callers waiting for an
 * interstitial to close.
 */
function finishPresentation() {
  if (
    presentationCompletionTimer
  ) {
    clearTimeout(
      presentationCompletionTimer,
    );

    presentationCompletionTimer =
      null;
  }

  const resolve =
    resolvePresentationCompletion;

  resolvePresentationCompletion =
    null;

  presentationCompletionPromise =
    null;

  resolve?.();
}

/**
 * Creates a promise that resolves when
 * the interstitial closes.
 *
 * A timeout prevents navigation from
 * remaining blocked forever in case an
 * SDK event is unexpectedly missed.
 */
function beginPresentation():
  Promise<void> {
  const completion =
    new Promise<void>(
      (resolve) => {
        resolvePresentationCompletion =
          resolve;
      },
    );

  presentationCompletionPromise =
    completion;

  presentationCompletionTimer =
    setTimeout(
      () => {
        if (__DEV__) {
          console.info(
            "[Ads] interstitial close wait timed out",
          );
        }

        finishPresentation();
      },
      PRESENTATION_COMPLETION_TIMEOUT_MS,
    );

  return completion;
}

/**
 * Removes the current interstitial
 * and all listeners.
 */
function releaseInterstitial() {
  finishPresentation();

  eventUnsubscribers.forEach(
    (
      unsubscribe,
    ) => {
      try {
        unsubscribe();
      } catch {
        // Ignore listener cleanup failure.
      }
    },
  );

  eventUnsubscribers =
    [];

  interstitial =
    null;

  isLoaded =
    false;

  isLoading =
    false;
}

/**
 * Retry loading only when ads are
 * currently allowed.
 *
 * VIP users must not trigger background
 * AdMob loading.
 */
function scheduleLoadRetry() {
  if (
    retryTimer ||
    !areAdsEnabled()
  ) {
    return;
  }

  retryTimer =
    setTimeout(
      () => {
        retryTimer =
          null;

        if (
          areAdsEnabled()
        ) {
          void loadInterstitial();
        }
      },
      LOAD_RETRY_DELAY_MS,
    );
}

/**
 * Creates one AdMob interstitial instance
 * and attaches its lifecycle listeners.
 */
function createInterstitial(
  adsModule:
    GoogleMobileAdsModule,
  adUnitId:
    string,
):
  | InterstitialAdInstance
  | null {
  /**
   * Never create an ad for a VIP user.
   */
  if (
    !areAdsEnabled()
  ) {
    return null;
  }

  try {
    const ad =
      adsModule.InterstitialAd.createForAdRequest(
        adUnitId,
      );

    eventUnsubscribers =
      [
        ad.addAdEventListener(
          adsModule
            .AdEventType
            .LOADED,
          () => {
            if (
              interstitial !==
              ad
            ) {
              return;
            }

            /**
             * User may have become VIP while
             * the advertisement was loading.
             */
            if (
              !areAdsEnabled()
            ) {
              releaseInterstitial();

              return;
            }

            clearRetryTimer();

            isLoading =
              false;

            isLoaded =
              true;

            if (__DEV__) {
              console.info(
                "[Ads] interstitial loaded",
              );
            }
          },
        ),

        ad.addAdEventListener(
          adsModule
            .AdEventType
            .ERROR,
          (
            error,
          ) => {
            if (
              interstitial !==
              ad
            ) {
              return;
            }

            isShowingInterstitial =
              false;

            logLoadError(
              error,
            );

            releaseInterstitial();

            if (
              areAdsEnabled()
            ) {
              scheduleLoadRetry();
            }
          },
        ),

        ad.addAdEventListener(
          adsModule
            .AdEventType
            .CLOSED,
          () => {
            if (
              interstitial !==
              ad
            ) {
              return;
            }

            isShowingInterstitial =
              false;

            releaseInterstitial();

            /**
             * Load the next advertisement only
             * when the user is still eligible.
             */
            if (
              areAdsEnabled()
            ) {
              void loadInterstitial();
            }
          },
        ),
      ];

    return ad;
  } catch (
    error
  ) {
    if (__DEV__) {
      console.warn(
        "[Ads] interstitial could not be created",
        error,
      );
    }

    return null;
  }
}

/**
 * Preloads an interstitial.
 *
 * VIP:
 * returns immediately without loading
 * or initializing AdMob.
 */
export function loadInterstitial():
  Promise<void> {
  if (
    !areAdsEnabled()
  ) {
    return Promise.resolve();
  }

  if (
    isLoaded ||
    isLoading ||
    isShowingInterstitial
  ) {
    return Promise.resolve();
  }

  if (
    loadPromise
  ) {
    return loadPromise;
  }

  loadPromise =
    (async () => {
      /**
       * Recheck because VIP state may change
       * between scheduling and execution.
       */
      if (
        !areAdsEnabled()
      ) {
        return;
      }

      const initialized =
        await initializeAdMob();

      if (
        !initialized ||
        !areAdsEnabled()
      ) {
        return;
      }

      const adsModule =
        await getGoogleMobileAdsModule();

      if (
        !adsModule ||
        !areAdsEnabled()
      ) {
        return;
      }

      const adUnitId =
        getInterstitialAdUnitId(
          adsModule
            .TestIds
            .INTERSTITIAL,
        );

      if (
        !adUnitId ||
        !areAdsEnabled()
      ) {
        return;
      }

      clearRetryTimer();

      interstitial ??=
        createInterstitial(
          adsModule,
          adUnitId,
        );

      if (
        !interstitial ||
        isLoaded ||
        isLoading ||
        isShowingInterstitial ||
        !areAdsEnabled()
      ) {
        return;
      }

      try {
        isLoading =
          true;

        interstitial.load();
      } catch (
        error
      ) {
        isLoading =
          false;

        if (__DEV__) {
          console.warn(
            "[Ads] interstitial could not be loaded",
            error,
          );
        }

        releaseInterstitial();

        scheduleLoadRetry();
      }
    })().finally(
      () => {
        loadPromise =
          null;
      },
    );

  return loadPromise;
}

/**
 * Displays the currently loaded
 * interstitial if allowed and ready.
 *
 * This method is the final protection
 * against advertisements being shown to
 * VIP users.
 */
export async function showInterstitialIfReady(
  reason:
    string,
  options:
    ShowInterstitialOptions = {},
): Promise<boolean> {
  if (
    !areAdsEnabled()
  ) {
    if (__DEV__) {
      console.info(
        `[Ads] interstitial skipped: ads-disabled (${reason})`,
      );
    }

    return false;
  }

  const isInsideCooldown =
    Date.now() -
      lastInterstitialShownAt <
    INTERSTITIAL_COOLDOWN_MS;

  if (
    isShowingInterstitial
  ) {
    if (__DEV__) {
      console.info(
        "[Ads] interstitial skipped: already-showing",
      );
    }

    if (
      options.waitForClose &&
      presentationCompletionPromise
    ) {
      await presentationCompletionPromise;
    }

    return false;
  }

  if (
    isInsideCooldown
  ) {
    if (__DEV__) {
      console.info(
        "[Ads] interstitial skipped: cooldown",
      );
    }

    return false;
  }

  if (
    !interstitial ||
    !isLoaded ||
    !interstitial.loaded
  ) {
    if (__DEV__) {
      console.info(
        `[Ads] interstitial not ready: ${reason}`,
      );
    }

    void loadInterstitial();

    return false;
  }

  /**
   * Final VIP check immediately before showing.
   */
  if (
    !areAdsEnabled()
  ) {
    releaseInterstitial();

    return false;
  }

  const activeInterstitial =
    interstitial;

  const presentationCompletion =
    beginPresentation();

  try {
    isShowingInterstitial =
      true;

    isLoaded =
      false;

    lastInterstitialShownAt =
      Date.now();

    await activeInterstitial.show();

    if (__DEV__) {
      console.info(
        `[Ads] interstitial shown: ${reason}`,
      );
    }

    if (
      options.waitForClose
    ) {
      await presentationCompletion;
    }

    return true;
  } catch (
    error
  ) {
    isShowingInterstitial =
      false;

    if (__DEV__) {
      console.warn(
        "[Ads] interstitial could not be shown",
        error,
      );
    }

    releaseInterstitial();

    if (
      areAdsEnabled()
    ) {
      scheduleLoadRetry();
    }

    return false;
  }
}

/**
 * Backwards-compatible API.
 *
 * Prefer using the ad-session functions.
 */
export function showInterstitial():
  Promise<boolean> {
  return showInterstitialIfReady(
    "legacy-call",
  );
}

/**
 * Backwards compatibility for older callers.
 *
 * Typed/manual EAN lookups do not increment
 * the camera scan counter.
 */
export async function recordSuccessfulEanSearch():
  Promise<boolean> {
  if (
    !areAdsEnabled()
  ) {
    return false;
  }

  const {
    recordSuccessfulEanSearch:
      recordSafeTransition,
  } =
    await import(
      "./ad-session"
    );

  return recordSafeTransition();
}

/**
 * React to VIP status changes globally.
 */
subscribeToAdsEnabled(
  (
    enabled,
  ) => {
    if (
      !enabled
    ) {
      clearRetryTimer();

      /**
       * Discard any loaded advertisement as soon as
       * the account becomes VIP.
       *
       * We don't attempt to close an ad that is
       * already visibly presented by the native SDK.
       */
      if (
        !isShowingInterstitial
      ) {
        releaseInterstitial();
      }

      if (__DEV__) {
        console.info(
          "[Ads] interstitial service disabled",
        );
      }

      return;
    }

    if (__DEV__) {
      console.info(
        "[Ads] interstitial service enabled",
      );
    }

    /**
     * Prepare an advertisement when ads become
     * available again, for example after:
     *
     * VIP logout -> anonymous user
     */
    void loadInterstitial();
  },
);