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
import {
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";

import ArrowLeftIcon from "../../../../../assets/icons/arrow-left.svg";
import ProductListBannerAd from "../../../../components/ads/product-list-banner-ad";
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

function goBack(
  router: ReturnType<typeof useRouter>,
  returnTo?: string,
  details: Record<string, unknown> = {},
) {
  debugBack("subgroup-back", {
    canGoBack: router.canGoBack(),
    returnTo,
    ...details,
  });

  // Prefer a stack dismissal, then consume the navigator's real history.
  // The explicit route remains the no-history fallback.
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

  // Fallback only when no returnTo was supplied.
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)/(main)");
}
function ChoiceCard({
  bg,
  image,
  title,
  text,
  button,
  buttonBg,
  onPress,
  disabled = false,
}: {
  bg: string;
  image: any;
  title: string;
  text: string;
  button: string;
  buttonBg: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={[
        styles.choiceCard,
        { backgroundColor: bg },
        disabled && styles.choiceCardDisabled,
      ]}
    >
      <View style={styles.choiceImageWrap}>
        <Image
          source={image}
          style={styles.choiceImage}
          contentFit="cover"
        />
      </View>

      <View style={styles.choiceCopy}>
        <Text style={styles.choiceTitle}>{title}</Text>

        <Text style={styles.choiceText}>{text}</Text>

        <Pressable
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => [
            styles.choiceButton,
            {
              backgroundColor: disabled ? "#C8C8C8" : buttonBg,
            },
            pressed && !disabled && styles.choiceButtonPressed,
          ]}
        >
          <Text style={styles.choiceButtonText}>{button}</Text>

          {!disabled && <Text style={styles.arrow}>→</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export default function SubGroupChoiceScreen() {
  const router = useRouter();
  const pathname = usePathname();

  const { id, returnTo } = useLocalSearchParams<{
    id: string;
    returnTo?: string;
  }>();

  const subgroupId = Array.isArray(id) ? id[0] : id;

  const returnToPath =
    typeof returnTo === "string" ? returnTo : undefined;

  const currentReturnPath = `/(tabs)/(main)/subgroup/${subgroupId}${
    returnToPath
      ? `?returnTo=${encodeURIComponent(returnToPath)}`
      : ""
  }`;

  const {
    data: subgroup,
    isLoading,
    isError,
    refetch,
  } = useSubGroupById(subgroupId);

  if (isLoading) {
    return (
      <View style={styles.centerPage}>
        <ActivityIndicator size="large" color="#86C6BA" />
        <Text style={styles.stateText}>Chargement...</Text>
      </View>
    );
  }

  if (isError || !subgroup) {
    return (
      <View style={styles.centerPage}>
        <Text style={styles.errorTitle}>
          Impossible de charger cette option.
        </Text>

        <Pressable
          onPress={() => refetch()}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            goBack(router, returnToPath, {
              pathname,
              params: {
                id: subgroupId,
                returnTo,
              },
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

  

  const firstJourney = [...(subgroup.journeys ?? [])].sort(
    (first, second) => Number(first.id) - Number(second.id),
  )[0];

  const firstProductList = [...(subgroup.productLists ?? [])].sort(
    (first, second) => Number(first.id) - Number(second.id),
  )[0];

  const openFirstJourney = () => {
    if (!firstJourney) {
      return;
    }

    router.push({
      pathname: "/(tabs)/(main)/journeys/[id]",
      params: {
        id: String(firstJourney.id),
        returnTo: currentReturnPath,
      },
    });
  };

  const openFirstProductList = () => {
    if (!firstProductList) {
      return;
    }

    router.push({
      pathname:
        "/(tabs)/(main)/product-lists/[id]/products",
      params: {
        id: String(firstProductList.id),
        returnTo: currentReturnPath,
      },
    });
  };

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
              params: {
                id: subgroupId,
                returnTo,
              },
              source: "header",
            })
          }
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && styles.iconBtnPressed,
          ]}
        >
          <ArrowLeftIcon width={22} height={22} />
        </Pressable>

        <View style={styles.iconSpacer} />
      </View>

      <View style={styles.header}>
        <View style={styles.subgroupIconWrap}>
          <Image
            source={imageSource(subgroup.imageUrl)}
            style={styles.subgroupIcon}
            contentFit="cover"
          />
        </View>

        <Text style={styles.title}>{subgroup.name}</Text>

        <Text style={styles.subtitle}>
          Choisissez une option pour obtenir des recommandations
          personnalisées ou explorer les produits adaptés.
        </Text>
      </View>

      <ChoiceCard
        bg="#E9F7F2"
        image={ROUTINE_IMAGE}
        title="Choisir ma routine"
        text={
          firstJourney
            ? "Choisissez votre routine adaptés  vos besoins."
            : "Aucune routine n’est actuellement disponible pour cette catégorie."
        }
        button={firstJourney ? "Commencer" : "Indisponible"}
        buttonBg="#86C6BA"
        disabled={!firstJourney}
        onPress={openFirstJourney}
      />

      <ChoiceCard
        bg="#FCECEA"
        image={PRODUCTS_IMAGE}
        title="Explorer les produits"
        text={
          firstProductList
            ? "Consultez tous les produits de cette catégorie avec leurs scores, ingrédients et avis."
            : "Aucune liste de produits n’est actuellement disponible pour cette catégorie."
        }
        button={
          firstProductList
            ? "Voir les produits"
            : "Indisponible"
        }
        buttonBg="#C97E82"
        disabled={!firstProductList}
        onPress={openFirstProductList}
      />
      </ScrollView>
      <ProductListBannerAd />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FBF8F4",
  },

  page: {
    flex: 1,
    backgroundColor: "#FBF8F4",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 18,
  },

  centerPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBF8F4",
    paddingHorizontal: 24,
  },

  stateText: {
    marginTop: 12,
    color: "#625D58",
    fontSize: 15,
    fontWeight: "600",
  },

  errorTitle: {
    color: "#3F3B37",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 26,
  },

  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#86C6BA",
  },

  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  backTextBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  backText: {
    color: "#625D58",
    fontSize: 15,
    fontWeight: "700",
  },

  topBar: {
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(63, 59, 55, 0.08)",
    
  },

  iconBtnPressed: {
    opacity: 0.7,
  },

  iconSpacer: {
    width: 44,
  },

  header: {
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 4,
  },

  subgroupIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  subgroupIcon: {
    width: "100%",
    height: "100%",
  },

  title: {
    marginTop: 16,
    color: "#3F3B37",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    color: "rgba(63, 59, 55, 0.65)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  choiceCard: {
    minHeight: 178,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 24,
    overflow: "hidden",
  },

  choiceCardDisabled: {
    opacity: 0.75,
  },

  choiceImageWrap: {
    width: 112,
    height: 142,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.65)",
  },

  choiceImage: {
    width: "100%",
    height: "100%",
  },

  choiceCopy: {
    flex: 1,
    alignItems: "flex-start",
  },

  choiceTitle: {
    color: "#3F3B37",
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },

  choiceText: {
    marginTop: 7,
    color: "rgba(63, 59, 55, 0.7)",
    fontSize: 13,
    lineHeight: 19,
  },

  choiceButton: {
    minHeight: 42,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  choiceButtonPressed: {
    opacity: 0.8,
  },

  choiceButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  arrow: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
