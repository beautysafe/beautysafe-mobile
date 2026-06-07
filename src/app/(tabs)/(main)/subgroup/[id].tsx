import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";

import ArrowLeftIcon from "../../../../../assets/icons/arrow-left.svg";
import { useSubGroupById } from "../../../../hooks/useGroups";

const FALLBACK_IMAGE = require("../../../../../assets/img/skin.png");
const ROUTINE_IMAGE = require("../../../../../assets/img/journey.png");
const PRODUCTS_IMAGE = require("../../../../../assets/img/loop.png");

function imageSource(uri?: string | null) {
  return uri ? { uri } : FALLBACK_IMAGE;
}

function debugBack(label: string, details: Record<string, unknown>) {
  if (__DEV__) {
    console.debug(`[nav:${label}]`, details);
  }
}

function goBack(router: ReturnType<typeof useRouter>, returnTo?: string, details = {}) {
  debugBack("subgroup-back", {
    canGoBack: router.canGoBack(),
    returnTo,
    ...details,
  });

  if (returnTo) {
    router.push(returnTo as any);
    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.push("/(tabs)/(main)");
}

function ChoiceCard({
  bg,
  image,
  title,
  text,
  button,
  buttonBg,
  onPress,
}: {
  bg: string;
  image: any;
  title: string;
  text: string;
  button: string;
  buttonBg: string;
  onPress: () => void;
}) {
  return (
    <View style={[styles.choiceCard, { backgroundColor: bg }]}>
      <View style={styles.choiceImageWrap}>
        <Image source={image} style={styles.choiceImage} contentFit="cover" />
      </View>
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceText}>{text}</Text>
        <Pressable onPress={onPress} style={[styles.choiceButton, { backgroundColor: buttonBg }]}>
          <Text style={styles.choiceButtonText}>{button}</Text>
          <Text style={styles.arrow}>{"->"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SubGroupChoiceScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const returnToPath = typeof returnTo === "string" ? returnTo : undefined;
  const currentReturnPath = `/(tabs)/(main)/subgroup/${id}${
    returnToPath ? `?returnTo=${encodeURIComponent(returnToPath)}` : ""
  }`;
  const { data: subgroup, isLoading, isError, refetch } = useSubGroupById(id);

  if (isLoading) {
    return (
      <View style={styles.centerPage}>
        <ActivityIndicator />
        <Text style={styles.stateText}>Chargement...</Text>
      </View>
    );
  }

  if (isError || !subgroup) {
    return (
      <View style={styles.centerPage}>
        <Text style={styles.errorTitle}>Impossible de charger cette option.</Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reessayer</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            goBack(router, returnToPath, {
              pathname,
              params: { id, returnTo },
              source: "error-state",
            })
          }
          style={styles.backTextBtn}
        >
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
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
        <View style={styles.iconSpacer} />
      </View>

      <View style={styles.header}>
        <View style={styles.subgroupIconWrap}>
          <Image source={imageSource(subgroup.imageUrl)} style={styles.subgroupIcon} contentFit="cover" />
        </View>
        <Text style={styles.title}>{subgroup.name}</Text>
        <Text style={styles.subtitle}>
          Choisissez une option pour obtenir des recommandations personnalisees ou explorer les produits adaptes.
        </Text>
      </View>

      <ChoiceCard
        bg="#E9F7F2"
        image={ROUTINE_IMAGE}
        title="Verifier ma routine"
        text="Analysez votre routine actuelle, identifiez les incompatibilites."
        button="Commencer"
        buttonBg="#86C6BA"
        onPress={() =>
          router.push({
            pathname: "/(tabs)/(main)/journeys/[id]",
            params: {
              id: "1",
              returnTo: currentReturnPath,
            },
          })
        }
      />

      <ChoiceCard
        bg="#FCECEA"
        image={PRODUCTS_IMAGE}
        title="Explorer les produits"
        text="Consultez tous les produits de cette categorie avec leurs scores, ingredients et avis."
        button="Voir les produits"
        buttonBg="#C97E82"
        onPress={() =>
          router.push({
            pathname: "/(tabs)/(main)/product-lists/[id]/products",
            params: {
              id: "1",
              returnTo: currentReturnPath,
            },
          })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4", },
  content: { padding: 16, paddingBottom: 28 },
  centerPage: {
    flex: 1,
    backgroundColor: "#FBF8F4",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconSpacer: { width: 44, height: 44 },
  header: { alignItems: "center", paddingHorizontal: 18, marginBottom: 28 },
  subgroupIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 999,
    backgroundColor: "#F7E9E7",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  subgroupIcon: { width: "100%", height: "100%" },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#3F3B37",
    textAlign: "center",
    marginBottom: 14,
  },
  subtitle: {
    color: "rgba(63,59,55,0.62)",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  choiceCard: {
    minHeight: 270,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginBottom: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  choiceImageWrap: {
    width: "43%",
    height: 190,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  choiceImage: { width: "100%", height: "100%" },
  choiceCopy: { flex: 1, paddingLeft: 10 },
  choiceTitle: { fontSize: 18, lineHeight: 27, fontWeight: "900", color: "#3F3B37" },
  choiceText: {
    marginTop: 14,
    color: "rgba(63,59,55,0.68)",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600",
  },
  choiceButton: {
    marginTop: 20,
    minHeight: 50,
    borderRadius: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  choiceButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  arrow: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  stateText: { marginTop: 10, color: "rgba(63,59,55,0.65)", fontWeight: "700" },
  errorTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#B42318",
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#86C6BA",
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { color: "#fff", fontWeight: "900" },
  backTextBtn: { marginTop: 12, padding: 10 },
  backText: { color: "rgba(63,59,55,0.7)", fontWeight: "800" },
});
