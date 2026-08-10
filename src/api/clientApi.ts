import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_API_URL = "https://api.beautysafe.online";
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (configuredApiUrl || DEFAULT_API_URL).replace(/\/+$/, "");
export const API_TIMEOUT_MS = 15_000;
export const TOKEN_KEY = "token";

type ApiFetchOptions = RequestInit & {
  timeoutMs?: number;
};

type ApiError = Error & {
  code?: string;
  data?: unknown;
  status?: number;
  url?: string;
};

if (__DEV__) {
  console.info("[API] configuration", {
    baseUrl: API_BASE_URL,
    envConfigured: Boolean(configuredApiUrl),
  });
}

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function parseResponseBody(text: string): any {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function redactForLog(value: unknown, depth = 0): unknown {
  if (depth >= 3) return "[omitted]";

  if (typeof value === "string") {
    const redacted = value
      .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-token]");
    return redacted.length > 500 ? `${redacted.slice(0, 500)}…` : redacted;
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 5).map((item) => redactForLog(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      /address|authorization|cookie|credential|email|password|phone|secret|session|token/i.test(
        key
      )
        ? "[redacted]"
        : redactForLog(item, depth + 1),
    ])
  );
}

async function requestApi<T = any>(
  path: string,
  options: ApiFetchOptions,
  includeAuth: boolean
): Promise<T> {
  const {
    timeoutMs = API_TIMEOUT_MS,
    signal: callerSignal,
    ...requestOptions
  } = options;
  const url = buildApiUrl(path);
  const method = (requestOptions.method || "GET").toUpperCase();
  const startedAt = Date.now();
  const token = includeAuth ? await AsyncStorage.getItem(TOKEN_KEY) : null;
  const controller = new AbortController();
  let didTimeout = false;

  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) {
    controller.abort();
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  const headers = new Headers(requestOptions.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (
    typeof requestOptions.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (__DEV__) {
    console.info("[API] request", {
      method,
      url,
      authentication: includeAuth ? (token ? "present" : "missing") : "not-required",
      timeoutMs,
    });
  }

  try {
    const response = await fetch(url, {
      ...requestOptions,
      method,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    const body = parseResponseBody(text);

    if (__DEV__) {
      console.info("[API] response", {
        method,
        url,
        status: response.status,
        ok: response.ok,
        durationMs: Date.now() - startedAt,
      });
    }

    if (!response.ok) {
      if (__DEV__) {
        console.info("[API] response error", {
          method,
          url,
          status: response.status,
          body: redactForLog(body),
        });
      }

      const responseBody = body as any;
      const errorMessage =
        responseBody?.message ||
        responseBody?.error ||
        (typeof responseBody === "string" ? responseBody : "") ||
        (Array.isArray(responseBody) ? responseBody.join(", ") : "") ||
        `HTTP ${response.status}`;
      const error = new Error(
        String(redactForLog(errorMessage))
      ) as ApiError;

      error.status = response.status;
      error.data = body;
      error.url = url;
      throw error;
    }

    return body as T;
  } catch (error: unknown) {
    if (didTimeout) {
      const timeoutError = new Error(
        `Request timed out after ${timeoutMs} ms`
      ) as ApiError;
      timeoutError.name = "ApiTimeoutError";
      timeoutError.code = "API_TIMEOUT";
      timeoutError.url = url;

      if (__DEV__) {
        console.info("[API] request timeout", {
          method,
          url,
          timeoutMs,
        });
      }

      throw timeoutError;
    }

    const requestError = error as ApiError;
    if (__DEV__ && !requestError.status) {
      console.info("[API] request error", {
        method,
        url,
        type: controller.signal.aborted ? "aborted" : "network",
        name: requestError.name,
        message: requestError.message,
        durationMs: Date.now() - startedAt,
      });
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export function apiFetch<T = any>(path: string, options: ApiFetchOptions = {}) {
  return requestApi<T>(path, options, true);
}

export function publicApiFetch<T = any>(path: string, options: ApiFetchOptions = {}) {
  return requestApi<T>(path, options, false);
}

let developmentConnectivityCheck: Promise<void> | null = null;

// Temporary development probe: remove once the affected devices are verified.
export function runDevelopmentApiConnectivityCheck() {
  if (!__DEV__) return Promise.resolve();
  if (developmentConnectivityCheck) return developmentConnectivityCheck;

  console.info("[API connectivity] checking", {
    url: buildApiUrl("/groups"),
  });

  developmentConnectivityCheck = publicApiFetch("/groups", {
    method: "GET",
    timeoutMs: 8_000,
  })
    .then((body: any) => {
      console.info("[API connectivity] reachable", {
        status: 200,
        itemCount: Array.isArray(body)
          ? body.length
          : Array.isArray(body?.data)
            ? body.data.length
            : undefined,
      });
    })
    .catch((error: ApiError) => {
      console.info("[API connectivity] unreachable", {
        baseUrl: API_BASE_URL,
        code: error.code,
        status: error.status,
        name: error.name,
        message: error.message,
      });
    });

  return developmentConnectivityCheck;
}
