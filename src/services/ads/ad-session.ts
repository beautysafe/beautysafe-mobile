import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppState,
  type AppStateStatus,
  type NativeEventSubscription,
} from "react-native";

import { showInterstitialIfReady } from "./interstitial";

export const AD_SCAN_COUNT_STORAGE_KEY = "@beautysafe/ad_scan_count";

const PRODUCTION_ACTIVE_USAGE_THRESHOLD_MS = 5 * 60 * 1000;
const DEFAULT_DEVELOPMENT_ACTIVE_USAGE_THRESHOLD_MS = 30_000;
const MAX_REMEMBERED_SCAN_EVENTS = 200;

function getActiveUsageThresholdMs(): number {
  if (!__DEV__) {
    return PRODUCTION_ACTIVE_USAGE_THRESHOLD_MS;
  }

  const configuredThreshold = Number(
    process.env.EXPO_PUBLIC_AD_ACTIVE_USAGE_THRESHOLD_MS,
  );

  return Number.isFinite(configuredThreshold) && configuredThreshold > 0
    ? configuredThreshold
    : DEFAULT_DEVELOPMENT_ACTIVE_USAGE_THRESHOLD_MS;
}

export const ACTIVE_USAGE_THRESHOLD_MS = getActiveUsageThresholdMs();

type SuccessfulCameraScanResult = {
  processed: boolean;
  scanCount: number;
  eligible: boolean;
  shown: boolean;
};

const processedScanEventIds = new Set<string>();
let cachedScanCount: number | null = null;
let scanOperationQueue: Promise<void> = Promise.resolve();

let appState: AppStateStatus = AppState.currentState;
let appStateSubscription: NativeEventSubscription | null = null;
let trackerConsumerCount = 0;
let accumulatedActiveUsageMs = 0;
let activeUsageStartedAt: number | null = null;
let eligibilityTimer: ReturnType<typeof setTimeout> | null = null;
let timeAdEligible = false;

function logStorageError(operation: string, error: unknown) {
  if (__DEV__) {
    console.warn(`[Ads] could not ${operation} scan count`, error);
  }
}

function parseScanCount(value: string | null): number {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

async function readScanCount(): Promise<number> {
  if (cachedScanCount !== null) {
    return cachedScanCount;
  }

  try {
    cachedScanCount = parseScanCount(
      await AsyncStorage.getItem(AD_SCAN_COUNT_STORAGE_KEY),
    );
  } catch (error) {
    cachedScanCount = 0;
    logStorageError("read", error);
  }

  return cachedScanCount;
}

async function persistScanCount(scanCount: number): Promise<void> {
  cachedScanCount = scanCount;

  try {
    await AsyncStorage.setItem(
      AD_SCAN_COUNT_STORAGE_KEY,
      String(scanCount),
    );
  } catch (error) {
    logStorageError("persist", error);
  }
}

function rememberScanEvent(eventId: string) {
  processedScanEventIds.add(eventId);

  if (processedScanEventIds.size <= MAX_REMEMBERED_SCAN_EVENTS) {
    return;
  }

  const oldestEventId = processedScanEventIds.values().next().value;

  if (oldestEventId) {
    processedScanEventIds.delete(oldestEventId);
  }
}

export function isSuccessfulCameraScanAdEligible(scanCount: number): boolean {
  return scanCount === 5 || scanCount >= 7;
}

function clearEligibilityTimer() {
  if (eligibilityTimer) {
    clearTimeout(eligibilityTimer);
    eligibilityTimer = null;
  }
}

function markTimeAdEligible() {
  if (timeAdEligible) {
    return;
  }

  clearEligibilityTimer();
  accumulatedActiveUsageMs = ACTIVE_USAGE_THRESHOLD_MS;
  activeUsageStartedAt = null;
  timeAdEligible = true;

  if (__DEV__) {
    console.info("[Ads] interstitial eligible: active-usage");
  }
}

function scheduleEligibilityTimer() {
  clearEligibilityTimer();

  if (
    timeAdEligible ||
    appState !== "active" ||
    activeUsageStartedAt === null
  ) {
    return;
  }

  const elapsedSinceResume = Date.now() - activeUsageStartedAt;
  const remaining = Math.max(
    0,
    ACTIVE_USAGE_THRESHOLD_MS -
      accumulatedActiveUsageMs -
      elapsedSinceResume,
  );

  eligibilityTimer = setTimeout(() => {
    eligibilityTimer = null;

    if (appState !== "active" || activeUsageStartedAt === null) {
      return;
    }

    accumulatedActiveUsageMs += Date.now() - activeUsageStartedAt;
    activeUsageStartedAt = null;
    markTimeAdEligible();
  }, remaining);
}

function pauseActiveUsageTracking() {
  if (activeUsageStartedAt !== null) {
    accumulatedActiveUsageMs += Date.now() - activeUsageStartedAt;
    activeUsageStartedAt = null;
  }

  clearEligibilityTimer();

  if (accumulatedActiveUsageMs >= ACTIVE_USAGE_THRESHOLD_MS) {
    markTimeAdEligible();
  }
}

function resumeActiveUsageTracking() {
  if (timeAdEligible || appState !== "active") {
    return;
  }

  activeUsageStartedAt ??= Date.now();
  scheduleEligibilityTimer();
}

function consumeTimeAdEligibility() {
  timeAdEligible = false;
  accumulatedActiveUsageMs = 0;
  activeUsageStartedAt = appState === "active" ? Date.now() : null;
  scheduleEligibilityTimer();

  if (__DEV__) {
    console.info("[Ads] active-usage timer reset");
  }
}

function handleAppStateChange(nextAppState: AppStateStatus) {
  if (nextAppState === appState) {
    return;
  }

  if (nextAppState === "active") {
    appState = nextAppState;
    resumeActiveUsageTracking();
    return;
  }

  pauseActiveUsageTracking();
  appState = nextAppState;
}

export function startActiveUsageTracking(): () => void {
  trackerConsumerCount += 1;

  if (trackerConsumerCount === 1) {
    appState = AppState.currentState;
    appStateSubscription = AppState.addEventListener(
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

  let stopped = false;

  return () => {
    if (stopped) {
      return;
    }

    stopped = true;
    trackerConsumerCount = Math.max(0, trackerConsumerCount - 1);

    if (trackerConsumerCount === 0) {
      pauseActiveUsageTracking();
      appStateSubscription?.remove();
      appStateSubscription = null;
    }
  };
}

async function maybeShowEligibleInterstitial(
  reason: string,
  scanEligible: boolean,
): Promise<boolean> {
  const timeEligibleAtTransition = timeAdEligible;

  if (!scanEligible && !timeEligibleAtTransition) {
    return false;
  }

  const combinedReason = scanEligible
    ? timeEligibleAtTransition
      ? `${reason}+active-usage`
      : reason
    : "active-usage";
  const shown = await showInterstitialIfReady(combinedReason);

  if (shown && timeEligibleAtTransition) {
    consumeTimeAdEligibility();
  }

  return shown;
}

export function maybeShowTimeInterstitial(
  reason = "safe-transition",
): Promise<boolean> {
  return maybeShowEligibleInterstitial(reason, false);
}

/**
 * A typed/manual EAN lookup is not a camera scan. It is retained as a safe
 * checkpoint for an already-eligible active-usage interstitial.
 */
export function recordSuccessfulEanSearch(): Promise<boolean> {
  return maybeShowTimeInterstitial("successful-ean-search");
}

export function recordSuccessfulCameraScan(
  scanEventId: string,
): Promise<SuccessfulCameraScanResult> {
  const normalizedEventId = scanEventId.trim();
  let resolveResult!: (result: SuccessfulCameraScanResult) => void;
  let rejectResult!: (reason?: unknown) => void;
  const resultPromise = new Promise<SuccessfulCameraScanResult>(
    (resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    },
  );

  scanOperationQueue = scanOperationQueue
    .then(async () => {
      const previousCount = await readScanCount();

      if (!normalizedEventId || processedScanEventIds.has(normalizedEventId)) {
        if (__DEV__ && normalizedEventId) {
          console.info(`[Ads] duplicate camera scan ignored: ${normalizedEventId}`);
        }

        resolveResult({
          processed: false,
          scanCount: previousCount,
          eligible: false,
          shown: false,
        });
        return;
      }

      rememberScanEvent(normalizedEventId);

      const scanCount = previousCount + 1;
      await persistScanCount(scanCount);

      if (__DEV__) {
        console.info(`[Ads] successful camera scan count: ${scanCount}`);
      }

      const eligible = isSuccessfulCameraScanAdEligible(scanCount);

      if (eligible && __DEV__) {
        console.info(`[Ads] interstitial eligible: scan-${scanCount}`);
      }

      const shown = await maybeShowEligibleInterstitial(
        `scan-${scanCount}`,
        eligible,
      );

      resolveResult({
        processed: true,
        scanCount,
        eligible,
        shown,
      });
    })
    .catch((error) => {
      rejectResult(error);
    });

  return resultPromise;
}

export function runDevelopmentAdPolicyChecks() {
  if (!__DEV__) {
    return;
  }

  const expectedEligibleCounts = new Set([5, 7, 8, 9, 10]);
  const failures: number[] = [];

  for (let scanCount = 1; scanCount <= 10; scanCount += 1) {
    if (
      isSuccessfulCameraScanAdEligible(scanCount) !==
      expectedEligibleCounts.has(scanCount)
    ) {
      failures.push(scanCount);
    }
  }

  if (failures.length > 0) {
    console.warn(
      `[Ads] scan policy check failed at: ${failures.join(", ")}`,
    );
    return;
  }

  console.info("[Ads] scan policy check passed for scans 1-10");
}
