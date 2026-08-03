import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

type Props = {
  title: string;
  url: string;
};

export function InAppWebViewScreen({ title, url }: Props) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/(main)");
  };

  const handleLoadError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setReloadKey((currentKey) => currentKey + 1);
  };

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir en arrière"
          hitSlop={8}
          onPress={handleBack}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color="#203A42" />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.webViewContainer}>
        {hasError ? (
          <View style={styles.errorState}>
            <Ionicons name="cloud-offline-outline" size={42} color="#687C79" />
            <Text style={styles.errorText}>
              Impossible de charger cette page.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleRetry}
              style={styles.retryButton}
            >
              <Ionicons name="refresh" size={19} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <WebView
              key={reloadKey}
              source={{ uri: url }}
              style={styles.webView}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              onLoadStart={() => {
                setHasError(false);
                setIsLoading(true);
              }}
              onLoadEnd={() => setIsLoading(false)}
              onError={handleLoadError}
              onHttpError={handleLoadError}
            />

            {isLoading ? (
              <View style={styles.loadingState} pointerEvents="none">
                <ActivityIndicator size="large" color="#687C79" />
              </View>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FBF8F4",
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#FBF8F4",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(32,58,66,0.08)",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(32,58,66,0.05)",
  },
  headerTitle: {
    flex: 1,
    color: "#203A42",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#FBF8F4",
  },
  webView: {
    flex: 1,
    backgroundColor: "#FBF8F4",
  },
  loadingState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBF8F4",
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 28,
    backgroundColor: "#FBF8F4",
  },
  errorText: {
    color: "#3F3B37",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    textAlign: "center",
  },
  retryButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: "#687C79",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
