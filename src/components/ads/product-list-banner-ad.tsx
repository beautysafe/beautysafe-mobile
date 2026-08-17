import React from "react";
import { StyleSheet } from "react-native";

import { AdBanner } from "./AdBanner";

export function ProductListBannerAd() {
  return <AdBanner style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "rgba(0,0,0,0.06)",
    borderTopWidth: 1,
  },
});

export default ProductListBannerAd;
