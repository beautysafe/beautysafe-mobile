import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  AppState,
  type AppStateStatus,
  type NativeEventSubscription,
} from "react-native";

import {
  showInterstitialIfReady,
} from "./interstitial";

import {
  areAdsEnabled,
  subscribeToAdsEnabled,
} from "./admob";

export const AD_SCAN_COUNT_STORAGE_KEY =
  "@beautysafe/ad_scan_count";

export const AD_BANNER_DETAIL_OPEN_COUNT_STORAGE_KEY =
  "@beautysafe/ad_banner_detail_open_count";

const PRODUCTION_ACTIVE_USAGE_THRESHOLD_MS =
  5 * 60 * 1000;

const DEFAULT_DEVELOPMENT_ACTIVE_USAGE_THRESHOLD_MS =
  30_000;

const MAX_REMEMBERED_SCAN_EVENTS =
  200;

/**
 * Production:
 * 5 minutes.
 *
 * Development:
 * 30 seconds by default, unless overridden.
 */
function getActiveUsageThresholdMs():
  number {
  if (
    !__DEV__
  ) {
    return PRODUCTION_ACTIVE_USAGE_THRESHOLD_MS;
  }

  const configuredThreshold =
    Number(
      process.env
        .EXPO_PUBLIC_AD_ACTIVE_USAGE_THRESHOLD_MS,
    );

  return Number.isFinite(
    configuredThreshold,
  ) &&
    configuredThreshold >
      0
    ? configuredThreshold
    : DEFAULT_DEVELOPMENT_ACTIVE_USAGE_THRESHOLD_MS;
}

export const ACTIVE_USAGE_THRESHOLD_MS =
  getActiveUsageThresholdMs();

type SuccessfulCameraScanResult = {
  processed: boolean;
  scanCount: number;
  eligible: boolean;
  shown: boolean;
};

type BannerDetailOpenResult = {
  openCount: number;
  eligible: boolean;
  shown: boolean;
};

const processedScanEventIds =
  new Set<string>();

let cachedScanCount:
  | number
  | null = null;

let scanOperationQueue:
  Promise<void> =
  Promise.resolve();

let cachedBannerDetailOpenCount:
  | number
  | null = null;

let bannerDetailOpenOperationQueue:
  Promise<void> =
  Promise.resolve();

let appState:
  AppStateStatus =
  AppState.currentState;

let appStateSubscription:
  | NativeEventSubscription
  | null = null;

let trackerConsumerCount =
  0;

let accumulatedActiveUsageMs =
  0;

let activeUsageStartedAt:
  | number
  | null = null;

let eligibilityTimer:
  | ReturnType<typeof setTimeout>
  | null = null;

let timeAdEligible =
  false;

/**
 * Storage logging.
 */
function logStorageError(
  operation:
    string,
  error:
    unknown,
) {
  if (__DEV__) {
    console.warn(
      `[Ads] could not ${operation} scan count`,
      error,
    );
  }
}

function logBannerStorageError(
  operation:
    string,
  error:
    unknown,
) {
  if (__DEV__) {
    console.warn(
      `[Ads] could not ${operation} banner detail open count`,
      error,
    );
  }
}

/**
 * Parse a persisted non-negative integer.
 */
function parseCount(
  value:
    string | null,
): number {
  const parsed =
    Number(
      value,
    );

  return Number.isSafeInteger(
    parsed,
  ) &&
    parsed >= 0
    ? parsed
    : 0;
}

/**
 * Camera scan persistence.
 */
async function readScanCount():
  Promise<number> {
  if (
    cachedScanCount !==
    null
  ) {
    return cachedScanCount;
  }

  try {
    cachedScanCount =
      parseCount(
        await AsyncStorage.getItem(
          AD_SCAN_COUNT_STORAGE_KEY,
        ),
      );
  } catch (
    error
  ) {
    cachedScanCount =
      0;

    logStorageError(
      "read",
      error,
    );
  }

  return cachedScanCount;
}

async function persistScanCount(
  scanCount:
    number,
): Promise<void> {
  cachedScanCount =
    scanCount;

  try {
    await AsyncStorage.setItem(
      AD_SCAN_COUNT_STORAGE_KEY,
      String(
        scanCount,
      ),
    );
  } catch (
    error
  ) {
    logStorageError(
      "persist",
      error,
    );
  }
}

/**
 * Home promotion-banner opening persistence.
 */
async function readBannerDetailOpenCount():
  Promise<number> {
  if (
    cachedBannerDetailOpenCount !==
    null
  ) {
    return cachedBannerDetailOpenCount;
  }

  try {
    cachedBannerDetailOpenCount =
      parseCount(
        await AsyncStorage.getItem(
          AD_BANNER_DETAIL_OPEN_COUNT_STORAGE_KEY,
        ),
      );
  } catch (
    error
  ) {
    cachedBannerDetailOpenCount =
      0;

    logBannerStorageError(
      "read",
      error,
    );
  }

  return cachedBannerDetailOpenCount;
}

async function persistBannerDetailOpenCount(
  openCount:
    number,
): Promise<void> {
  cachedBannerDetailOpenCount =
    openCount;

  try {
    await AsyncStorage.setItem(
      AD_BANNER_DETAIL_OPEN_COUNT_STORAGE_KEY,
      String(
        openCount,
      ),
    );
  } catch (
    error
  ) {
    logBannerStorageError(
      "persist",
      error,
    );
  }
}

/**
 * Prevents one physical scan from being counted
 * more than once during the current JS session.
 */
function rememberScanEvent(
  eventId:
    string,
) {
  processedScanEventIds.add(
    eventId,
  );

  if (
    processedScanEventIds.size <=
    MAX_REMEMBERED_SCAN_EVENTS
  ) {
    return;
  }

  const oldestEventId =
    processedScanEventIds.values().next()
      .value;

  if (
    oldestEventId
  ) {
    processedScanEventIds.delete(
      oldestEventId,
    );
  }
}

/**
 * Existing BeautySafe camera-scan policy:
 *
 * Scan 1-4 -> no event ad
 * Scan 5   -> ad eligible
 * Scan 6   -> skipped
 * Scan 7+  -> ad eligible
 */
export function isSuccessfulCameraScanAdEligible(
  scanCount:
    number,
): boolean {
  return (
    scanCount === 5 ||
    scanCount >= 7
  );
}

/**
 * Banner details:
 *
 * 1 -> no ad
 * 2 -> ad
 * 3 -> no ad
 * 4 -> ad
 * etc.
 */
export function isBannerDetailOpenAdEligible(
  openCount:
    number,
): boolean {
  return (
    openCount >
      0 &&
    openCount %
      2 ===
      0
  );
}

/**
 * Active-usage / 5-minute policy.
 */
function clearEligibilityTimer() {
  if (
    eligibilityTimer
  ) {
    clearTimeout(
      eligibilityTimer,
    );

    eligibilityTimer =
      null;
  }
}

/**
 * Reset all time-based ad state.
 *
 * Called when the user is VIP.
 */
function resetActiveUsageForAdsDisabled() {
  clearEligibilityTimer();

  accumulatedActiveUsageMs =
    0;

  activeUsageStartedAt =
    null;

  timeAdEligible =
    false;
}

function markTimeAdEligible() {
  /**
   * VIP users must never become eligible.
   */
  if (
    !areAdsEnabled() ||
    timeAdEligible
  ) {
    return;
  }

  clearEligibilityTimer();

  accumulatedActiveUsageMs =
    ACTIVE_USAGE_THRESHOLD_MS;

  activeUsageStartedAt =
    null;

  timeAdEligible =
    true;

  if (__DEV__) {
    console.info(
      "[Ads] interstitial eligible: active-usage",
    );
  }
}

function scheduleEligibilityTimer() {
  clearEligibilityTimer();

  if (
    !areAdsEnabled() ||
    timeAdEligible ||
    appState !==
      "active" ||
    activeUsageStartedAt ===
      null
  ) {
    return;
  }

  const elapsedSinceResume =
    Date.now() -
    activeUsageStartedAt;

  const remaining =
    Math.max(
      0,
      ACTIVE_USAGE_THRESHOLD_MS -
        accumulatedActiveUsageMs -
        elapsedSinceResume,
    );

  eligibilityTimer =
    setTimeout(
      () => {
        eligibilityTimer =
          null;

        if (
          !areAdsEnabled() ||
          appState !==
            "active" ||
          activeUsageStartedAt ===
            null
        ) {
          return;
        }

        accumulatedActiveUsageMs +=
          Date.now() -
          activeUsageStartedAt;

        activeUsageStartedAt =
          null;

        markTimeAdEligible();
      },
      remaining,
    );
}

function pauseActiveUsageTracking() {
  if (
    !areAdsEnabled()
  ) {
    resetActiveUsageForAdsDisabled();

    return;
  }

  if (
    activeUsageStartedAt !==
    null
  ) {
    accumulatedActiveUsageMs +=
      Date.now() -
      activeUsageStartedAt;

    activeUsageStartedAt =
      null;
  }

  clearEligibilityTimer();

  if (
    accumulatedActiveUsageMs >=
    ACTIVE_USAGE_THRESHOLD_MS
  ) {
    markTimeAdEligible();
  }
}

function resumeActiveUsageTracking() {
  if (
    !areAdsEnabled() ||
    timeAdEligible ||
    appState !==
      "active"
  ) {
    return;
  }

  activeUsageStartedAt ??=
    Date.now();

  scheduleEligibilityTimer();
}

function consumeTimeAdEligibility() {
  /**
   * Nothing to reset for a VIP user.
   */
  if (
    !areAdsEnabled()
  ) {
    resetActiveUsageForAdsDisabled();

    return;
  }

  timeAdEligible =
    false;

  accumulatedActiveUsageMs =
    0;

  activeUsageStartedAt =
    appState ===
    "active"
      ? Date.now()
      : null;

  scheduleEligibilityTimer();

  if (__DEV__) {
    console.info(
      "[Ads] active-usage timer reset",
    );
  }
}

function handleAppStateChange(
  nextAppState:
    AppStateStatus,
) {
  if (
    nextAppState ===
    appState
  ) {
    return;
  }

  if (
    nextAppState ===
    "active"
  ) {
    appState =
      nextAppState;

    resumeActiveUsageTracking();

    return;
  }

  pauseActiveUsageTracking();

  appState =
    nextAppState;
}

/**
 * Start active usage tracking.
 *
 * This may be called before AuthProvider has
 * resolved the current user.
 *
 * If ads are disabled at that moment, the
 * consumer count is remembered and tracking will
 * begin later only if ads become enabled.
 */
export function startActiveUsageTracking():
  () => void {
  trackerConsumerCount +=
    1;

  if (
    trackerConsumerCount ===
      1 &&
    areAdsEnabled()
  ) {
    appState =
      AppState.currentState;

    appStateSubscription =
      AppState.addEventListener(
        "change",
        handleAppStateChange,
      );

    resumeActiveUsageTracking();

    if (__DEV__) {
      console.info(
        `[Ads] active-usage threshold: ${ACTIVE_USAGE_THRESHOLD_MS}ms`,
      );
    }
  }

  let stopped =
    false;

  return () => {
    if (
      stopped
    ) {
      return;
    }

    stopped =
      true;

    trackerConsumerCount =
      Math.max(
        0,
        trackerConsumerCount -
          1,
      );

    if (
      trackerConsumerCount ===
      0
    ) {
      if (
        areAdsEnabled()
      ) {
        pauseActiveUsageTracking();
      } else {
        resetActiveUsageForAdsDisabled();
      }

      appStateSubscription?.remove();

      appStateSubscription =
        null;
    }
  };
}

/**
 * Centralized decision point for showing
 * event-driven or time-driven interstitials.
 */
async function maybeShowEligibleInterstitial(
  reason:
    string,
  eventEligible:
    boolean,
  waitForClose =
    false,
): Promise<boolean> {
  if (
    !areAdsEnabled()
  ) {
    return false;
  }

  const timeEligibleAtTransition =
    timeAdEligible;

  if (
    !eventEligible &&
    !timeEligibleAtTransition
  ) {
    return false;
  }

  const combinedReason =
    eventEligible
      ? timeEligibleAtTransition
        ? `${reason}+active-usage`
        : reason
      : "active-usage";

  const shown =
    await showInterstitialIfReady(
      combinedReason,
      {
        waitForClose,
      },
    );

  /**
   * Consume the 5-minute eligibility only when
   * an advertisement was actually displayed.
   */
  if (
    shown &&
    timeEligibleAtTransition
  ) {
    consumeTimeAdEligibility();
  }

  return shown;
}

/**
 * Safe transition checkpoint for the 5-minute
 * active-usage advertisement.
 */
export function maybeShowTimeInterstitial(
  reason =
    "safe-transition",
): Promise<boolean> {
  if (
    !areAdsEnabled()
  ) {
    return Promise.resolve(
      false,
    );
  }

  return maybeShowEligibleInterstitial(
    reason,
    false,
  );
}

/**
 * Manual / typed EAN search.
 *
 * Does NOT increment camera scan count.
 *
 * It remains a safe transition for an already
 * eligible 5-minute advertisement.
 */
export function recordSuccessfulEanSearch():
  Promise<boolean> {
  if (
    !areAdsEnabled()
  ) {
    return Promise.resolve(
      false,
    );
  }

  return maybeShowTimeInterstitial(
    "successful-ean-search",
  );
}

/**
 * Called when a user deliberately opens a Home
 * promotion banner.
 *
 * VIP users:
 *
 * - don't increment the counter
 * - don't load an ad
 * - don't show an ad
 */
export function recordBannerDetailOpenAndMaybeShowAd():
  Promise<BannerDetailOpenResult> {
  if (
    !areAdsEnabled()
  ) {
    return Promise.resolve({
      openCount:
        cachedBannerDetailOpenCount ??
        0,

      eligible:
        false,

      shown:
        false,
    });
  }

  const operation =
    bannerDetailOpenOperationQueue.then(
      async () => {
        /**
         * Recheck inside the queue in case the
         * user's VIP state changed while waiting.
         */
        if (
          !areAdsEnabled()
        ) {
          return {
            openCount:
              cachedBannerDetailOpenCount ??
              0,

            eligible:
              false,

            shown:
              false,
          };
        }

        const previousCount =
          await readBannerDetailOpenCount();

        /**
         * VIP state could theoretically change
         * during AsyncStorage access.
         */
        if (
          !areAdsEnabled()
        ) {
          return {
            openCount:
              previousCount,

            eligible:
              false,

            shown:
              false,
          };
        }

        const openCount =
          previousCount +
          1;

        await persistBannerDetailOpenCount(
          openCount,
        );

        if (__DEV__) {
          console.info(
            `[Ads] Banner detail open count: ${openCount}`,
          );
        }

        const eligible =
          isBannerDetailOpenAdEligible(
            openCount,
          );

        if (
          !eligible
        ) {
          return {
            openCount,
            eligible,
            shown:
              false,
          };
        }

        if (__DEV__) {
          console.info(
            "[Ads] Banner detail interstitial eligible",
          );
        }

        const shown =
          await maybeShowEligibleInterstitial(
            `banner-detail-${openCount}`,
            true,
            true,
          );

        if (
          !shown &&
          __DEV__
        ) {
          console.info(
            "[Ads] Interstitial unavailable, continuing navigation",
          );
        }

        return {
          openCount,
          eligible,
          shown,
        };
      },
    );

  bannerDetailOpenOperationQueue =
    operation.then(
      () =>
        undefined,
      () =>
        undefined,
    );

  return operation;
}

/**
 * Called after a successful CAMERA scan.
 *
 * VIP users:
 *
 * - do not increment scan count
 * - do not become scan-ad eligible
 * - do not trigger interstitials
 */
export function recordSuccessfulCameraScan(
  scanEventId:
    string,
): Promise<SuccessfulCameraScanResult> {
  if (
    !areAdsEnabled()
  ) {
    return Promise.resolve({
      processed:
        false,

      scanCount:
        cachedScanCount ??
        0,

      eligible:
        false,

      shown:
        false,
    });
  }

  const normalizedEventId =
    scanEventId.trim();

  let resolveResult!:
    (
      result:
        SuccessfulCameraScanResult,
    ) => void;

  let rejectResult!:
    (
      reason?:
        unknown,
    ) => void;

  const resultPromise =
    new Promise<SuccessfulCameraScanResult>(
      (
        resolve,
        reject,
      ) => {
        resolveResult =
          resolve;

        rejectResult =
          reject;
      },
    );

  scanOperationQueue =
    scanOperationQueue
      .then(
        async () => {
          /**
           * User may have become VIP while this
           * operation waited in the queue.
           */
          if (
            !areAdsEnabled()
          ) {
            resolveResult({
              processed:
                false,

              scanCount:
                cachedScanCount ??
                0,

              eligible:
                false,

              shown:
                false,
            });

            return;
          }

          const previousCount =
            await readScanCount();

          /**
           * One more check after AsyncStorage.
           */
          if (
            !areAdsEnabled()
          ) {
            resolveResult({
              processed:
                false,

              scanCount:
                previousCount,

              eligible:
                false,

              shown:
                false,
            });

            return;
          }

          if (
            !normalizedEventId ||
            processedScanEventIds.has(
              normalizedEventId,
            )
          ) {
            if (
              __DEV__ &&
              normalizedEventId
            ) {
              console.info(
                `[Ads] duplicate camera scan ignored: ${normalizedEventId}`,
              );
            }

            resolveResult({
              processed:
                false,

              scanCount:
                previousCount,

              eligible:
                false,

              shown:
                false,
            });

            return;
          }

          rememberScanEvent(
            normalizedEventId,
          );

          const scanCount =
            previousCount +
            1;

          await persistScanCount(
            scanCount,
          );

          if (__DEV__) {
            console.info(
              `[Ads] successful camera scan count: ${scanCount}`,
            );
          }

          const eligible =
            isSuccessfulCameraScanAdEligible(
              scanCount,
            );

          if (
            eligible &&
            __DEV__
          ) {
            console.info(
              `[Ads] interstitial eligible: scan-${scanCount}`,
            );
          }

          const shown =
            await maybeShowEligibleInterstitial(
              `scan-${scanCount}`,
              eligible,
            );

          resolveResult({
            processed:
              true,

            scanCount,

            eligible,

            shown,
          });
        },
      )
      .catch(
        (
          error,
        ) => {
          rejectResult(
            error,
          );
        },
      );

  return resultPromise;
}

/**
 * When AuthProvider changes VIP/ad availability,
 * update the active-usage tracker immediately.
 */
subscribeToAdsEnabled(
  (
    enabled,
  ) => {
    if (
      !enabled
    ) {
      resetActiveUsageForAdsDisabled();

      appStateSubscription?.remove();

      appStateSubscription =
        null;

      if (__DEV__) {
        console.info(
          "[Ads] ad session disabled",
        );
      }

      return;
    }

    /**
     * A component may already have called
     * startActiveUsageTracking() before auth was
     * resolved.
     *
     * Resume tracking now that ads are allowed.
     */
    if (
      trackerConsumerCount >
        0 &&
      !appStateSubscription
    ) {
      appState =
        AppState.currentState;

      appStateSubscription =
        AppState.addEventListener(
          "change",
          handleAppStateChange,
        );

      resumeActiveUsageTracking();

      if (__DEV__) {
        console.info(
          `[Ads] active-usage tracking enabled: ${ACTIVE_USAGE_THRESHOLD_MS}ms`,
        );
      }
    }
  },
);

/**
 * Development-only validation of the scan and
 * banner-detail policies.
 */
export function runDevelopmentAdPolicyChecks() {
  if (
    !__DEV__
  ) {
    return;
  }

  const expectedEligibleCounts =
    new Set([
      5,
      7,
      8,
      9,
      10,
    ]);

  const failures:
    number[] = [];

  for (
    let scanCount =
      1;
    scanCount <=
    10;
    scanCount +=
    1
  ) {
    if (
      isSuccessfulCameraScanAdEligible(
        scanCount,
      ) !==
      expectedEligibleCounts.has(
        scanCount,
      )
    ) {
      failures.push(
        scanCount,
      );
    }
  }

  if (
    failures.length >
    0
  ) {
    console.warn(
      `[Ads] scan policy check failed at: ${failures.join(", ")}`,
    );

    return;
  }

  console.info(
    "[Ads] scan policy check passed for scans 1-10",
  );

  const bannerFailures:
    number[] = [];

  for (
    let openCount =
      1;
    openCount <=
    8;
    openCount +=
    1
  ) {
    if (
      isBannerDetailOpenAdEligible(
        openCount,
      ) !==
      (openCount %
        2 ===
        0)
    ) {
      bannerFailures.push(
        openCount,
      );
    }
  }

  if (
    bannerFailures.length >
    0
  ) {
    console.warn(
      `[Ads] banner detail policy check failed at: ${bannerFailures.join(", ")}`,
    );

    return;
  }

  console.info(
    "[Ads] banner detail policy check passed for opens 1-8",
  );
}