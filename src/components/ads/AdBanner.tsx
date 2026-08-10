import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import {
  getBannerAdUnitId,
  getGoogleMobileAdsModule,
  initializeAdMob,
} from "../../services/ads/admob";
import type { GoogleMobileAdsModule } from "../../services/ads/admob";

type AdBannerProps = {
  style?: StyleProp<ViewStyle>;
};

export function AdBanner({ style }: AdBannerProps) {
  const [adsModule, setAdsModule] = useState<GoogleMobileAdsModule | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

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

  if (!adsModule || hasFailed) {
    return null;
  }

  const adUnitId = getBannerAdUnitId(adsModule.TestIds.ADAPTIVE_BANNER);

  if (!adUnitId) {
    return null;
  }

  const BannerAd = adsModule.BannerAd;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={adsModule.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={(error) => {
          setHasFailed(true);

          if (__DEV__) {
            console.warn("The banner ad failed to load.", error);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
});

export default AdBanner;
