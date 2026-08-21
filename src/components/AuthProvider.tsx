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

import type { User } from "../entities/User";

import {
  setAdsEnabled as setGlobalAdsEnabled,
} from "../services/ads/admob";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;

  /**
   * false for VIP users.
   *
   * Also false while the app is still determining
   * the user's VIP status.
   */
  adsEnabled: boolean;

  signIn: (
    email: string,
    password: string,
  ) => Promise<void>;

  signUp: (
    dto: authApi.RegisterDto,
  ) => Promise<void>;

  signOut: () => Promise<void>;

  refreshMe: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return context;
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    token,
    setToken,
  ] =
    useState<string | null>(
      null,
    );

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  /**
   * Separate from loading.
   *
   * We only enable ads after we actually know
   * whether the current user is VIP.
   */
  const [
    userResolved,
    setUserResolved,
  ] =
    useState(false);

  /**
   * Anonymous user:
   * userResolved = true
   * user = null
   * adsEnabled = true
   *
   * Standard authenticated user:
   * vip = false
   * adsEnabled = true
   *
   * VIP authenticated user:
   * vip = true
   * adsEnabled = false
   *
   * Session still being checked:
   * userResolved = false
   * adsEnabled = false
   */
  const adsEnabled =
    userResolved &&
    user?.vip !== true;

  /**
   * Synchronize React auth state with the
   * non-React advertising services.
   */
  useEffect(() => {
    setGlobalAdsEnabled(
      adsEnabled,
    );
  }, [
    adsEnabled,
  ]);

  const refreshMe =
    useCallback(
      async () => {
        try {
          const me =
            (await authApi.getMe()) as User;

          setUser(me);
          setUserResolved(true);

          const currentToken =
            await getStoredAccessToken();

          setToken(currentToken);

          if (__DEV__) {
            console.info(
              "[Auth] user session valid",
              {
                authenticated:
                  true,

                vip:
                  me.vip === true,

                adsEnabled:
                  me.vip !== true,
              },
            );
          }
        } catch (
          error: any
        ) {
          const status =
            error?.status;

          if (status === 401) {
            await clearSessionTokens();

            setToken(null);
            setUser(null);

            /**
             * Session is definitely gone,
             * therefore this is now effectively
             * an anonymous user.
             */
            setUserResolved(true);

            if (__DEV__) {
              console.info(
                "[Auth] session expired",
                {
                  status,
                },
              );
            }

            return;
          }

          /**
           * Network/server failures should NOT
           * log the user out.
           *
           * IMPORTANT:
           * Do not mark userResolved=true here
           * when we don't know whether the
           * authenticated user is VIP.
           *
           * Ads therefore remain disabled until
           * we successfully resolve /users/me.
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
              },
            );
          }
        }
      },
      [],
    );

  useEffect(() => {
    const unsubscribe =
      subscribeToAccessToken(
        (
          newToken,
        ) => {
          setToken(
            newToken,
          );

          if (!newToken) {
            setUser(
              null,
            );
          }
        },
      );

    let mounted =
      true;

    const bootstrap =
      async () => {
        try {
          setUserResolved(
            false,
          );

          await migrateLegacyAccessToken();

          const [
            storedAccessToken,
            storedRefreshToken,
          ] =
            await Promise.all([
              getStoredAccessToken(),
              getStoredRefreshToken(),
            ]);

          if (!mounted) {
            return;
          }

          setToken(
            storedAccessToken,
          );

          if (__DEV__) {
            console.info(
              "[Auth] storage restored",
              {
                accessToken:
                  Boolean(
                    storedAccessToken,
                  ),

                refreshToken:
                  Boolean(
                    storedRefreshToken,
                  ),
              },
            );
          }

          if (
            storedAccessToken ||
            storedRefreshToken
          ) {
            await refreshMe();
          } else {
            /**
             * No authenticated session.
             *
             * Anonymous users are allowed ads.
             */
            setUser(
              null,
            );

            setUserResolved(
              true,
            );
          }
        } catch (
          error: any
        ) {
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
              },
            );
          }
        } finally {
          if (mounted) {
            setLoading(
              false,
            );
          }
        }
      };

    void bootstrap();

    return () => {
      mounted = false;

      unsubscribe();
    };
  }, [
    refreshMe,
  ]);

  const signIn =
    useCallback(
      async (
        email: string,
        password: string,
      ) => {
        /**
         * Disable ads while we determine whether
         * this account is VIP.
         */
        setUserResolved(
          false,
        );

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
          response.accessToken,
        );

        const me =
          (await authApi.getMe()) as User;

        setUser(me);
        setUserResolved(true);

        if (__DEV__) {
          console.info(
            "[Auth] signed in",
            {
              authenticated:
                true,

              refreshSession:
                true,

              vip:
                me.vip ===
                true,

              adsEnabled:
                me.vip !==
                true,
            },
          );
        }
      },
      [],
    );

  const signUp =
    useCallback(
      async (
        dto:
          authApi.RegisterDto,
      ) => {
        await authApi.register(
          dto,
        );
      },
      [],
    );

  const signOut =
    useCallback(
      async () => {
        const refreshToken =
          await getStoredRefreshToken();

        await clearSessionTokens();

        setToken(null);
        setUser(null);

        /**
         * After logout the person is anonymous,
         * so normal ad policy applies again.
         */
        setUserResolved(true);

        if (refreshToken) {
          try {
            await authApi.logout(
              refreshToken,
            );

            if (__DEV__) {
              console.info(
                "[Auth] refresh session revoked",
              );
            }
          } catch (
            error: any
          ) {
            if (__DEV__) {
              console.info(
                "[Auth] remote logout failed; local session already cleared",
                {
                  status:
                    error?.status,

                  message:
                    error?.message,
                },
              );
            }
          }
        }
      },
      [],
    );

  const value =
    useMemo<AuthContextValue>(
      () => ({
        token,
        user,
        loading,
        adsEnabled,

        signIn,
        signUp,
        signOut,
        refreshMe,
      }),
      [
        token,
        user,
        loading,
        adsEnabled,
        signIn,
        signUp,
        signOut,
        refreshMe,
      ],
    );

  return (
    <AuthContext.Provider
      value={
        value
      }
    >
      {children}
    </AuthContext.Provider>
  );
}