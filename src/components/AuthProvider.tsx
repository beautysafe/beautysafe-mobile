import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as authApi from "../api/authApi";

import {
  clearSessionTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  migrateLegacyAccessToken,
  saveSessionTokens,
  subscribeToAccessToken,
} from "../api/clientApi";

type User = any;

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;

  signIn: (
    email: string,
    password: string
  ) => Promise<void>;

  signUp: (
    dto: authApi.RegisterDto
  ) => Promise<void>;

  signOut: () => Promise<void>;

  refreshMe: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(
    null
  );

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] =
    useState<string | null>(
      null
    );

  const [user, setUser] =
    useState<User | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  /**
   * apiFetch automatically refreshes the access token
   * if /users/me returns 401.
   *
   * Therefore refreshMe does NOT need to perform
   * refresh-token logic itself.
   */
  const refreshMe =
    useCallback(async () => {
      try {
        const me =
          await authApi.getMe();

        setUser(me);

        const currentToken =
          await getStoredAccessToken();

        setToken(currentToken);

        if (__DEV__) {
          console.info(
            "[Auth] user session valid",
            {
              authenticated:
                true,
            }
          );
        }
      } catch (error: any) {
        const status =
          error?.status;

        if (status === 401) {
          /**
           * clientApi already attempted refresh.
           *
           * Reaching this point means there is
           * genuinely no valid session anymore.
           */
          await clearSessionTokens();

          setToken(null);
          setUser(null);

          if (__DEV__) {
            console.info(
              "[Auth] session expired",
              {
                status,
              }
            );
          }

          return;
        }

        /**
         * Network/server failures should NOT log
         * the user out.
         */
        if (__DEV__) {
          console.info(
            "[Auth] unable to validate session; session preserved",
            {
              status:
                error?.status,

              code:
                error?.code,

              message:
                error?.message,
            }
          );
        }
      }
    }, []);

  useEffect(() => {
    /**
     * Keep React state synchronized when clientApi
     * silently rotates the access token.
     */
    const unsubscribe =
      subscribeToAccessToken(
        (newToken) => {
          setToken(newToken);

          if (!newToken) {
            setUser(null);
          }
        }
      );

    let mounted = true;

    const bootstrap =
      async () => {
        try {
          /**
           * Preserve old installations that stored
           * their JWT in AsyncStorage.
           */
          await migrateLegacyAccessToken();

          const [
            storedAccessToken,
            storedRefreshToken,
          ] = await Promise.all([
            getStoredAccessToken(),
            getStoredRefreshToken(),
          ]);

          if (!mounted) {
            return;
          }

          setToken(
            storedAccessToken
          );

          if (__DEV__) {
            console.info(
              "[Auth] storage restored",
              {
                accessToken:
                  Boolean(
                    storedAccessToken
                  ),

                refreshToken:
                  Boolean(
                    storedRefreshToken
                  ),
              }
            );
          }

          /**
           * Even if the access token expired, getMe()
           * will receive 401 and clientApi will use
           * the refresh token automatically.
           */
          if (
            storedAccessToken ||
            storedRefreshToken
          ) {
            await refreshMe();
          }
        } catch (error: any) {
          if (__DEV__) {
            console.error(
              "[Auth] bootstrap failed",
              {
                name:
                  error?.name,

                status:
                  error?.status,

                message:
                  error?.message,
              }
            );
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    void bootstrap();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [refreshMe]);

  const signIn =
    useCallback(
      async (
        email: string,
        password: string
      ) => {
        const response =
          await authApi.login({
            email,
            password,
          });

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

        setToken(
          response.accessToken
        );

        const me =
          await authApi.getMe();

        setUser(me);

        if (__DEV__) {
          console.info(
            "[Auth] signed in",
            {
              authenticated:
                true,

              refreshSession:
                true,
            }
          );
        }
      },
      []
    );

  const signUp =
    useCallback(
      async (
        dto:
          authApi.RegisterDto
      ) => {
        /**
         * Current backend register endpoint does
         * not document tokens in its response.
         *
         * Registration screen already performs:
         *
         * register()
         * signIn()
         *
         * so leave token creation to signIn().
         */
        await authApi.register(
          dto
        );
      },
      []
    );

  const signOut =
    useCallback(
      async () => {
        const refreshToken =
          await getStoredRefreshToken();

        /**
         * Remove local session immediately.
         *
         * User should be logged out locally even
         * when the device has no internet.
         */
        await clearSessionTokens();

        setToken(null);
        setUser(null);

        if (refreshToken) {
          try {
            await authApi.logout(
              refreshToken
            );

            if (__DEV__) {
              console.info(
                "[Auth] refresh session revoked"
              );
            }
          } catch (error: any) {
            /**
             * Local logout already succeeded.
             *
             * Do not restore local credentials simply
             * because server logout failed due to
             * temporary connectivity.
             */
            if (__DEV__) {
              console.info(
                "[Auth] remote logout failed; local session already cleared",
                {
                  status:
                    error?.status,

                  message:
                    error?.message,
                }
              );
            }
          }
        }
      },
      []
    );

  const value =
    useMemo<AuthContextValue>(
      () => ({
        token,
        user,
        loading,

        signIn,
        signUp,
        signOut,
        refreshMe,
      }),
      [
        token,
        user,
        loading,
        signIn,
        signUp,
        signOut,
        refreshMe,
      ]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}