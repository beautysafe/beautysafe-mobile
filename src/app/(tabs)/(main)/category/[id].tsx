import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";

import ArrowLeftIcon from "../../../../../assets/icons/arrow-left.svg";
import ProductListBannerAd from "../../../../components/ads/product-list-banner-ad";
import { useGroupById, useGroupSubGroups } from "../../../../hooks/useGroups";

const FALLBACK_GROUP_IMAGE = require("../../../../../assets/img/skin.png");
const CATEGORY_HORIZONTAL_PADDING = 16;
const SUBGROUP_COLUMN_GAP = 14;

function imageSource(uri?: string | null) {
  return uri ? { uri } : FALLBACK_GROUP_IMAGE;
}

function debugBack(label: string, details: Record<string, unknown>) {
  if (__DEV__) {
    console.debug(`[nav:${label}]`, details);
  }
}

function goBack(router: ReturnType<typeof useRouter>, returnTo?: string, details = {}) {
  debugBack("category-back", {
    canGoBack: router.canGoBack(),
    returnTo,
    ...details,
  });

  if (returnTo) {
    if (router.canDismiss()) {
      router.dismissTo(returnTo as never);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(returnTo as never);
    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)/(main)");
}

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const pathname = usePathname();
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const returnToPath = typeof returnTo === "string" ? returnTo : undefined;
  const currentReturnPath = `/(tabs)/(main)/category/${id}${
    returnToPath ? `?returnTo=${encodeURIComponent(returnToPath)}` : ""
  }`;
  const groupQuery = useGroupById(id);
  const subgroupsQuery = useGroupSubGroups(id);

  const group = groupQuery.data;
  const subgroups = useMemo(() => {
    if (subgroupsQuery.data?.length) return subgroupsQuery.data;
    return group?.subgroups ?? [];
  }, [group?.subgroups, subgroupsQuery.data]);

  const isLoading = groupQuery.isLoading || subgroupsQuery.isLoading;
  const isError =
    groupQuery.isError ||
    (subgroupsQuery.isError && !(group?.subgroups?.length ?? 0));
  const title = group?.title || group?.name || "Categorie";
  const subgroupCardWidth = Math.max(
    0,
    (screenWidth - CATEGORY_HORIZONTAL_PADDING * 2 - SUBGROUP_COLUMN_GAP) / 2,
  );

  if (isLoading) {
    return (
      <View style={styles.centerPage}>
        <ActivityIndicator />
        <Text style={styles.stateText}>Chargement de la categorie...</Text>
      </View>
    );
  }

  if (isError || !group) {
    return (
      <View style={styles.centerPage}>
        <Text style={styles.errorTitle}>Impossible de charger cette categorie.</Text>
        <Pressable
          onPress={() => {
            groupQuery.refetch();
            subgroupsQuery.refetch();
          }}
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>Reessayer</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            goBack(router, returnToPath, {
              pathname,
              params: { id, returnTo },
              source: "error-state",
            })
          }
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.topBar}>
        <Pressable
          onPress={() =>
            goBack(router, returnToPath, {
              pathname,
              params: { id, returnTo },
              source: "header",
            })
          }
          style={styles.iconBtn}
        >
          <ArrowLeftIcon width={22} height={22} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.iconSpacer} />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{group.title || group.name}</Text>
          {group.description ? (
            <Text style={styles.heroDesc}>{group.description}</Text>
          ) : (
            <Text style={styles.heroDesc}>
              Decouvrez les options adaptees a vos besoins.
            </Text>
          )}
        </View>
        <View style={styles.heroIconWrap}>
          <Image source={imageSource(group.imageUrl)} style={styles.heroIcon} contentFit="cover" />
        </View>
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.countText}>{subgroups.length} sous-categories</Text>
      </View>

      {subgroups.length ? (
        <View style={styles.grid}>
          {subgroups.map((subgroup, index) => (
            <Pressable
              key={subgroup.id}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/(main)/subgroup/[id]",
                  params: {
                    id: String(subgroup.id),
                    returnTo: currentReturnPath,
                  },
                })
              }
              style={({ pressed }) => [
                styles.card,
                { width: subgroupCardWidth },
                { opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <View
                style={[
                  styles.circle,
                  { backgroundColor: index % 2 === 0 ? "#EEF9F4" : "#FDF3EE" },
                ]}
              >
                <Image
                  source={imageSource(subgroup.imageUrl)}
                  style={styles.cardImage}
                  contentFit="cover"
                />
              </View>
              <Text
                style={styles.cardTitle}
                numberOfLines={2}
                maxFontSizeMultiplier={1.35}
              >
                {subgroup.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.stateText}>Aucune sous-categorie disponible.</Text>
        </View>
      )}
      </ScrollView>
      <ProductListBannerAd />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBF8F4" },
  page: { flex: 1, backgroundColor: "#FBF8F4", paddingTop: 22 },
  content: {
    padding: CATEGORY_HORIZONTAL_PADDING,
    paddingBottom: 24,
  },
  centerPage: {
    flex: 1,
    backgroundColor: "#FBF8F4",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 10,
  },
  topTitle: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "900", color: "#3F3B37" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconSpacer: { width: 44, height: 44 },
  hero: {
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
    backgroundColor: "#F3E3DE",
  },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: "900", color: "#3F3B37", lineHeight: 30 },
  heroDesc: { marginTop: 10, color: "rgba(63,59,55,0.65)", fontSize: 14, lineHeight: 22 },
  heroIconWrap: {
    width: 94,
    height: 94,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: { width: "100%", height: "100%" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  countText: { color: "rgba(63,59,55,0.55)", fontWeight: "700" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SUBGROUP_COLUMN_GAP,
  },
  card: {
    height: 168,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  circle: {
    width: 62,
    height: 62,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  cardImage: { width: 62, height: 62, borderRadius: 999 },
  cardTitle: {
    width: "100%",
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "900",
    color: "#3F3B37",
    lineHeight: 22,
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    padding: 18,
  },
  stateText: {
    marginTop: 10,
    color: "rgba(63,59,55,0.65)",
    textAlign: "center",
    fontWeight: "700",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#B42318",
    textAlign: "center",
    marginBottom: 16,
  },
  actionBtn: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#86C6BA",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: { marginTop: 12, padding: 10 },
  secondaryText: { color: "rgba(63,59,55,0.7)", fontWeight: "800" },
});
