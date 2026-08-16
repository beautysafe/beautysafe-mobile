import {
  apiFetch,
  publicApiFetch,
} from "./clientApi";

export type LoginDto = {
  email: string;
  password: string;
};

export type RegisterDto = {
  email: string;
  password: string;

  birthday?: string;
  skinType?: string;
  hairType?: string;
  phoneNumber?: string;
  address?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;

  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;

  /**
   * Legacy backend alias.
   */
  access_token?: string;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;

  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

export type LogoutResponse = {
  success: boolean;
};

export async function login(
  dto: LoginDto
): Promise<LoginResponse> {
  const response =
    await publicApiFetch<LoginResponse>(
      "/auth/login",
      {
        method: "POST",

        body: JSON.stringify({
          email:
            dto.email
              .trim()
              .toLowerCase(),

          password:
            dto.password,
        }),
      }
    );

  const accessToken =
    response?.accessToken ||
    response?.access_token;

  if (!accessToken) {
    throw new Error(
      "Access token not found in login response"
    );
  }

  if (!response?.refreshToken) {
    throw new Error(
      "Refresh token not found in login response"
    );
  }

  return {
    ...response,
    accessToken,
  };
}

export async function register(
  dto: RegisterDto
) {
  return publicApiFetch(
    "/auth/register",
    {
      method: "POST",

      body: JSON.stringify(
        dto
      ),
    }
  );
}

/**
 * Normally clientApi.ts performs refresh automatically.
 *
 * Keep this method only if another part of the application
 * ever needs to explicitly call the endpoint.
 */
export async function refresh(
  refreshToken: string
): Promise<RefreshResponse> {
  return publicApiFetch<RefreshResponse>(
    "/auth/refresh",
    {
      method: "POST",

      body: JSON.stringify({
        refreshToken,
      }),
    }
  );
}

export async function logout(
  refreshToken: string
): Promise<LogoutResponse> {
  return publicApiFetch<LogoutResponse>(
    "/auth/logout",
    {
      method: "POST",

      body: JSON.stringify({
        refreshToken,
      }),

      timeoutMs: 5_000,
    }
  );
}

export async function getMe() {
  return apiFetch(
    "/users/me"
  );
}