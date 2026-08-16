import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const DEFAULT_API_URL = "https://api.beautysafe.online";
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (
  configuredApiUrl || DEFAULT_API_URL
).replace(/\/+$/, "");

export const API_TIMEOUT_MS = 15_000;

/**
 * Old application versions stored the access token here.
 * Keep this export temporarily for compatibility/migration.
 */
export const TOKEN_KEY = "token";

export const ACCESS_TOKEN_KEY =
  "beautysafe_access_token";

export const REFRESH_TOKEN_KEY =
  "beautysafe_refresh_token";

export const ACCESS_TOKEN_EXPIRES_AT_KEY =
  "beautysafe_access_token_expires_at";

export const REFRESH_TOKEN_EXPIRES_AT_KEY =
  "beautysafe_refresh_token_expires_at";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
};

type ApiFetchOptions = RequestInit & {
  timeoutMs?: number;
};

export type ApiError = Error & {
  code?: string;
  data?: unknown;
  status?: number;
  url?: string;
};

type AccessTokenListener = (
  token: string | null
) => void;

const accessTokenListeners =
  new Set<AccessTokenListener>();

let refreshPromise: Promise<string> | null =
  null;

/**
 * Used to prevent a refresh request that started before
 * logout from saving a new session after logout.
 */
let sessionGeneration = 0;

if (__DEV__) {
  console.info("[API] configuration", {
    baseUrl: API_BASE_URL,
    envConfigured: Boolean(
      configuredApiUrl
    ),
  });
}

function buildApiUrl(path: string) {
  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

function parseResponseBody(
  text: string
): any {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function redactForLog(
  value: unknown,
  depth = 0
): unknown {
  if (depth >= 3) {
    return "[omitted]";
  }

  if (typeof value === "string") {
    const redacted = value
      .replace(
        /Bearer\s+\S+/gi,
        "Bearer [redacted]"
      )
      .replace(
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
        "[redacted-token]"
      )
      .replace(
        /bsrt_[A-Za-z0-9_-]+/g,
        "[redacted-refresh-token]"
      );

    return redacted.length > 500
      ? `${redacted.slice(0, 500)}…`
      : redacted;
  }

  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 5)
      .map((item) =>
        redactForLog(item, depth + 1)
      );
  }

  return Object.fromEntries(
    Object.entries(value).map(
      ([key, item]) => [
        key,
        /address|authorization|cookie|credential|email|password|phone|secret|session|token/i.test(
          key
        )
          ? "[redacted]"
          : redactForLog(
              item,
              depth + 1
            ),
      ]
    )
  );
}

function createApiError(
  status: number,
  body: any,
  url: string
): ApiError {
  const backendMessage =
    Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message ||
        body?.error ||
        (typeof body === "string"
          ? body
          : "") ||
        `HTTP ${status}`;

  const error = new Error(
    String(
      redactForLog(
        backendMessage
      )
    )
  ) as ApiError;

  error.status = status;
  error.data = body;
  error.url = url;

  return error;
}

function createSessionExpiredError() {
  const error = new Error(
    "Session expired"
  ) as ApiError;

  error.status = 401;
  error.code = "SESSION_EXPIRED";

  return error;
}

function emitAccessToken(
  token: string | null
) {
  accessTokenListeners.forEach(
    (listener) => {
      try {
        listener(token);
      } catch {
        // One listener must not break others.
      }
    }
  );
}

export function subscribeToAccessToken(
  listener: AccessTokenListener
) {
  accessTokenListeners.add(listener);

  return () => {
    accessTokenListeners.delete(
      listener
    );
  };
}

export async function getStoredAccessToken() {
  return SecureStore.getItemAsync(
    ACCESS_TOKEN_KEY
  );
}

export async function getStoredRefreshToken() {
  return SecureStore.getItemAsync(
    REFRESH_TOKEN_KEY
  );
}

export async function saveSessionTokens(
  session: AuthSession
) {
  if (
    !session.accessToken ||
    !session.refreshToken
  ) {
    throw new Error(
      "Invalid authentication session"
    );
  }

  await SecureStore.setItemAsync(
    ACCESS_TOKEN_KEY,
    session.accessToken
  );

  await SecureStore.setItemAsync(
    REFRESH_TOKEN_KEY,
    session.refreshToken
  );

  if (
    session.accessTokenExpiresAt
  ) {
    await SecureStore.setItemAsync(
      ACCESS_TOKEN_EXPIRES_AT_KEY,
      session.accessTokenExpiresAt
    );
  } else {
    await SecureStore.deleteItemAsync(
      ACCESS_TOKEN_EXPIRES_AT_KEY
    );
  }

  if (
    session.refreshTokenExpiresAt
  ) {
    await SecureStore.setItemAsync(
      REFRESH_TOKEN_EXPIRES_AT_KEY,
      session.refreshTokenExpiresAt
    );
  } else {
    await SecureStore.deleteItemAsync(
      REFRESH_TOKEN_EXPIRES_AT_KEY
    );
  }

  emitAccessToken(
    session.accessToken
  );
}

export async function clearSessionTokens() {
  /**
   * Invalidate refresh requests that may
   * currently be running.
   */
  sessionGeneration += 1;

  await Promise.all([
    SecureStore.deleteItemAsync(
      ACCESS_TOKEN_KEY
    ),

    SecureStore.deleteItemAsync(
      REFRESH_TOKEN_KEY
    ),

    SecureStore.deleteItemAsync(
      ACCESS_TOKEN_EXPIRES_AT_KEY
    ),

    SecureStore.deleteItemAsync(
      REFRESH_TOKEN_EXPIRES_AT_KEY
    ),

    /**
     * Remove token from old app versions.
     */
    AsyncStorage.removeItem(
      TOKEN_KEY
    ),
  ]);

  emitAccessToken(null);
}

/**
 * Existing installations may still have the old
 * access token inside AsyncStorage.
 *
 * Move it to SecureStore so an application update
 * does not immediately log those users out.
 *
 * IMPORTANT:
 * Old sessions do NOT have a refresh token.
 * Such users may need to log in once when the old
 * JWT finally expires.
 */
export async function migrateLegacyAccessToken() {
  const secureAccessToken =
    await getStoredAccessToken();

  if (secureAccessToken) {
    return secureAccessToken;
  }

  const legacyToken =
    await AsyncStorage.getItem(
      TOKEN_KEY
    );

  if (!legacyToken) {
    return null;
  }

  await SecureStore.setItemAsync(
    ACCESS_TOKEN_KEY,
    legacyToken
  );

  await AsyncStorage.removeItem(
    TOKEN_KEY
  );

  emitAccessToken(legacyToken);

  if (__DEV__) {
    console.info(
      "[Auth] legacy access token migrated to SecureStore"
    );
  }

  return legacyToken;
}

async function requestApi<T = any>(
  path: string,
  options: ApiFetchOptions,
  includeAuth: boolean,
  allowRefresh = true
): Promise<T> {
  const {
    timeoutMs = API_TIMEOUT_MS,
    signal: callerSignal,
    ...requestOptions
  } = options;

  const url = buildApiUrl(path);

  const method = (
    requestOptions.method || "GET"
  ).toUpperCase();

  const startedAt = Date.now();

  const accessToken =
    includeAuth
      ? await getStoredAccessToken()
      : null;

  const controller =
    new AbortController();

  let didTimeout = false;

  const abortFromCaller = () =>
    controller.abort();

  if (callerSignal?.aborted) {
    controller.abort();
  } else {
    callerSignal?.addEventListener(
      "abort",
      abortFromCaller,
      {
        once: true,
      }
    );
  }

  const timeoutId = setTimeout(
    () => {
      didTimeout = true;
      controller.abort();
    },
    timeoutMs
  );

  const headers =
    new Headers(
      requestOptions.headers
    );

  if (!headers.has("Accept")) {
    headers.set(
      "Accept",
      "application/json"
    );
  }

  if (
    typeof requestOptions.body ===
      "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  /**
   * Always use the latest access token.
   *
   * This is important after refresh because an
   * old Authorization header must not survive
   * into the retry.
   */
  if (includeAuth) {
    headers.delete(
      "Authorization"
    );

    if (accessToken) {
      headers.set(
        "Authorization",
        `Bearer ${accessToken}`
      );
    }
  }

  if (__DEV__) {
    console.info("[API] request", {
      method,
      url,
      authentication:
        includeAuth
          ? accessToken
            ? "present"
            : "missing"
          : "not-required",
      timeoutMs,
    });
  }

  try {
    const response = await fetch(
      url,
      {
        ...requestOptions,
        method,
        headers,
        signal:
          controller.signal,
      }
    );

    const text =
      await response.text();

    const body =
      parseResponseBody(text);

    if (__DEV__) {
      console.info(
        "[API] response",
        {
          method,
          url,
          status:
            response.status,
          ok: response.ok,
          durationMs:
            Date.now() -
            startedAt,
        }
      );
    }

    /**
     * Protected request rejected because
     * access JWT expired.
     *
     * Attempt one refresh and then retry
     * this request exactly once.
     */
    if (
      response.status === 401 &&
      includeAuth &&
      allowRefresh
    ) {
      if (__DEV__) {
        console.info(
          "[Auth] access token rejected; attempting refresh",
          {
            method,
            url,
          }
        );
      }

      await refreshAccessToken();

      return requestApi<T>(
        path,
        options,
        includeAuth,
        false
      );
    }

    if (!response.ok) {
      if (__DEV__) {
        console.info(
          "[API] response error",
          {
            method,
            url,
            status:
              response.status,
            body:
              redactForLog(body),
          }
        );
      }

      throw createApiError(
        response.status,
        body,
        url
      );
    }

    return body as T;
  } catch (error: unknown) {
    if (didTimeout) {
      const timeoutError =
        new Error(
          `Request timed out after ${timeoutMs} ms`
        ) as ApiError;

      timeoutError.name =
        "ApiTimeoutError";

      timeoutError.code =
        "API_TIMEOUT";

      timeoutError.url = url;

      if (__DEV__) {
        console.info(
          "[API] request timeout",
          {
            method,
            url,
            timeoutMs,
          }
        );
      }

      throw timeoutError;
    }

    const requestError =
      error as ApiError;

    if (
      __DEV__ &&
      !requestError.status
    ) {
      console.info(
        "[API] request error",
        {
          method,
          url,

          type:
            controller.signal
              .aborted
              ? "aborted"
              : "network",

          name:
            requestError.name,

          message:
            requestError.message,

          durationMs:
            Date.now() -
            startedAt,
        }
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);

    callerSignal?.removeEventListener(
      "abort",
      abortFromCaller
    );
  }
}

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

async function performRefresh(): Promise<string> {
  const refreshToken =
    await getStoredRefreshToken();

  if (!refreshToken) {
    await clearSessionTokens();

    throw createSessionExpiredError();
  }

  const generationAtStart =
    sessionGeneration;

  try {
    const response =
      await requestApi<RefreshResponse>(
        "/auth/refresh",
        {
          method: "POST",

          body: JSON.stringify({
            refreshToken,
          }),
        },
        false,
        false
      );

    if (
      !response?.accessToken ||
      !response?.refreshToken
    ) {
      throw new Error(
        "Invalid refresh response from API"
      );
    }

    /**
     * User may have logged out while this
     * refresh was still running.
     */
    if (
      generationAtStart !==
      sessionGeneration
    ) {
      throw createSessionExpiredError();
    }

    await saveSessionTokens({
      accessToken:
        response.accessToken,

      refreshToken:
        response.refreshToken,

      accessTokenExpiresAt:
        response.accessTokenExpiresAt,

      refreshTokenExpiresAt:
        response.refreshTokenExpiresAt,
    });

    if (__DEV__) {
      console.info(
        "[Auth] session refreshed successfully"
      );
    }

    return response.accessToken;
  } catch (error: unknown) {
    const apiError =
      error as ApiError;

    /**
     * 401 from /auth/refresh means the refresh
     * token is expired, revoked, invalid or reused.
     *
     * The user genuinely needs to log in again.
     */
    if (
      apiError?.status === 401
    ) {
      await clearSessionTokens();

      if (__DEV__) {
        console.info(
          "[Auth] refresh session expired or revoked"
        );
      }
    }

    /**
     * Network errors do NOT delete the session.
     * The application can try again when the
     * connection returns.
     */
    throw error;
  }
}

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise =
      performRefresh().finally(
        () => {
          refreshPromise = null;
        }
      );
  }

  return refreshPromise;
}

export function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
) {
  return requestApi<T>(
    path,
    options,
    true,
    true
  );
}

export function publicApiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
) {
  return requestApi<T>(
    path,
    options,
    false,
    false
  );
}

let developmentConnectivityCheck:
  Promise<void> | null = null;

export function runDevelopmentApiConnectivityCheck() {
  if (!__DEV__) {
    return Promise.resolve();
  }

  if (
    developmentConnectivityCheck
  ) {
    return developmentConnectivityCheck;
  }

  console.info(
    "[API connectivity] checking",
    {
      url: buildApiUrl(
        "/groups"
      ),
    }
  );

  developmentConnectivityCheck =
    publicApiFetch("/groups", {
      method: "GET",
      timeoutMs: 8_000,
    })
      .then((body: any) => {
        console.info(
          "[API connectivity] reachable",
          {
            status: 200,

            itemCount:
              Array.isArray(body)
                ? body.length
                : Array.isArray(
                      body?.data
                    )
                  ? body.data
                      .length
                  : undefined,
          }
        );
      })
      .catch(
        (error: ApiError) => {
          console.info(
            "[API connectivity] unreachable",
            {
              baseUrl:
                API_BASE_URL,

              code:
                error.code,

              status:
                error.status,

              name:
                error.name,

              message:
                error.message,
            }
          );
        }
      );

  return developmentConnectivityCheck;
}