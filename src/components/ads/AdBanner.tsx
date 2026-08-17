import React, { useEffect, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getBannerAdUnitId,
  getGoogleMobileAdsModule,
  initializeAdMob,
  isAdNoFillError,
} from "../../services/ads/admob";
import type { GoogleMobileAdsModule } from "../../services/ads/admob";

type AdBannerProps = {
  style?: StyleProp<ViewStyle>;
};

export function AdBanner({ style }: AdBannerProps) {
  const [adsModule, setAdsModule] = useState<GoogleMobileAdsModule | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reservedHeight = width >= 600 ? 100 : 66;

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const initialized = await initializeAdMob();

      if (!initialized) {
        return;
      }

      const module = await getGoogleMobileAdsModule();

      if (isMounted && module) {
        setAdsModule(module);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const adUnitId = adsModule
    ? getBannerAdUnitId(adsModule.TestIds.BANNER)
    : null;
  const BannerAd = adsModule?.BannerAd;

  return (
    <View
      style={[
        styles.container,
        {
          height: reservedHeight,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      {BannerAd && adsModule && adUnitId && !hasFailed ? (
        <BannerAd
          unitId={adUnitId}
          size={adsModule.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={(error) => {
            setHasFailed(true);

            if (!__DEV__) {
              return;
            }

            if (isAdNoFillError(error)) {
              console.info("[Ads] banner no-fill");
              return;
            }

            console.warn("[Ads] banner failed to load", error);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    overflow: "hidden",
  },
});

export default AdBanner;
