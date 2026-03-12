import React, { useEffect, useMemo } from "react";
import {View, Text, ActivityIndicator, ScrollView, StyleSheet, Pressable, Modal} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Image } from "expo-image";
import { useProductByEan } from "../../../../hooks/useProduct";
import type { Product } from "../../../../types/product";
import { scoreOn20, starsFrom20 } from "../../../../utils/score";
import HeartIcon from  "../../../../../assets/icons/heart.svg"
import HeartRedIcon from  "../../../../../assets/icons/heart-red.svg"
import ArrowLeftIcon from  "../../../../../assets/icons/arrow-left.svg"
import { useAuth } from "../../../../components/AuthProvider";
import { useFavorites } from "../../../../hooks/useFavorites";
import ProductDetailLoader from "../../../../components/ProductDetailLoader";
import NoProduct from "../../../../../assets/noProduct.svg";
function StarRow({ score20 }: { score20: number }) {
  const stars = starsFrom20(score20);
  return (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={[styles.star, i < stars ? styles.starOn : styles.starOff]}>
          ★
        </Text>
      ))}
      <Text style={styles.ratingText}>({(score20 / 4.8).toFixed(1)})</Text>
    </View>
  );
}

function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "accent" }) {
  return (
    <View style={[styles.chip, tone === "accent" ? styles.chipAccent : styles.chipNeutral]}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export default function ProductDetailsScreen() {
  const { token } = useAuth();
  const { ean } = useLocalSearchParams<{ ean?: string }>();
  const eanStr = typeof ean === "string" ? ean : "";

  const { data, isLoading, isError, error, refetch } = useProductByEan(eanStr);
  const productUid = (data as any)?.uid ?? (data as any)?.id;
  const {
    isFavorite,
    toggleFavorite,
    isMutating: favLoading,
  } = useFavorites(!!token);
  
  const isFav = isFavorite(productUid);
  useEffect(() => {
    if (eanStr) refetch();
  }, [eanStr, refetch]);

  const onPressHeart = async () => {
    if (!token) {
      router.push("/(auth)/login");
      return;
    }
    if (typeof productUid === "number") {
      await toggleFavorite(productUid);
    }  }
  const product = data as Product | undefined;

  const heroImage =
  product?.images?.[0]?.image ||
  product?.images?.[0]?.thumbnail ||
  (typeof (product as any)?.image === "string" ? (product as any).image : undefined);  
  const score20 = scoreOn20(product?.validScore);
  const [showAllIngredients, setShowAllIngredients] = React.useState(false);
  const [showImage, setShowImage] = React.useState(false);

  if (isLoading) {
    return <ProductDetailLoader />;
  }

  if (isError || !product) {
    return (
      <View style={styles.notFoundPage}>
        <Text style={styles.notFoundTitle}>Produit introuvable!</Text>
  
        <Text style={styles.notFoundSub}>
          Nous n’avons pas trouvé ce produit dans{"\n"}notre base de données.
        </Text>
  
        <View style={styles.notFoundArt}>
          <NoProduct width={300} height={300} />
        </View>
  
        <Text style={styles.notFoundHint}>
          Vous pouvez nous aider à l’ajouter en{"\n"}envoyant quelques images du produit.
        </Text>
  
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }
  const composition = Array.isArray(product?.composition) ? product!.composition : [];

  const INITIAL_LIMIT = 15;

  const ingredientChips = showAllIngredients
  ? composition
  : composition.slice(0, INITIAL_LIMIT);
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeftIcon></ArrowLeftIcon>
        </Pressable>
        <Text style={styles.topTitle}>Détail Produit</Text>
        <Pressable onPress={onPressHeart} style={styles.iconBtn} disabled={favLoading}>
        {isFav ? (
            <HeartRedIcon width={24} height={24} />
          ) : (
            <HeartIcon width={24} height={24} />
          )}
        </Pressable>
      </View>

      {/* Hero image card */}
      <View style={styles.heroCard}>
        {heroImage ? (
          <Pressable onPress={() => setShowImage(true)}>
            <Image
              source={{ uri: heroImage }}
              style={styles.heroImage}
              contentFit="cover"
            />
          </Pressable>
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Text style={styles.muted}>No image</Text>
          </View>
        )}
      </View>
      {heroImage && (
        <Modal visible={showImage} transparent animationType="fade">
          <View style={styles.imageModal}>
            <Pressable style={styles.imageModalClose} onPress={() => setShowImage(false)}>
              <Text style={styles.imageModalCloseText}>✕</Text>
            </Pressable>

            <Image
              source={{ uri: heroImage }}
              style={styles.fullImage}
              contentFit="contain"
            />
          </View>
        </Modal>
      )}
      {/* Product summary */}
      <View style={styles.card}>
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.desc}>
          {product.brand?.name ? `${product.brand.name} • ` : ""}
          {product.ean ? `EAN ${product.ean}` : ""}
        </Text>

        <View style={styles.scoreRow}>
          <View style={styles.dot} />
          <Text style={styles.scoreText}>
            <Text style={styles.scoreStrong}>{product.validScore}</Text>/20 <Text style={styles.muted}>points</Text>
          </Text>

          <StarRow score20={score20} />
        </View>
      </View>

      {/* Ingredients */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Ingrédients</Text>

                {ingredientChips.length === 0 ? (
                  <Text style={styles.muted}>Aucun ingrédient disponible.</Text>
                ) : (
                  <View style={styles.chipWrap}>
                    {ingredientChips.map((ing, idx) => (
                      <Chip
                        key={ing.id ?? idx}
                        label={ing.name || ing.officialName || "Ingrédient"}
                        tone={ing.score > 0 ? "accent" : "neutral"}   // ✅ accent if score > 1
                      />
                    ))}
                  </View>
                )}

                {composition.length > INITIAL_LIMIT && (
                  <Pressable
                    onPress={() => setShowAllIngredients((v) => !v)}
                    style={styles.moreBtn}
                  >
                    <Text style={styles.moreText}>
                      {showAllIngredients
                        ? "Voir moins"
                        : `+ ${composition.length - INITIAL_LIMIT} autres`}
                    </Text>
                  </Pressable>
                )}
              </View>


      {/* Benefits (static for now like screenshot) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Bienfaits</Text>

        <View style={styles.bulletRow}>
          <View style={[styles.bullet, { opacity: 0.55 }]} />
          <Text style={styles.bulletText}>Hydratation intensive 24h</Text>
        </View>
        <View style={styles.bulletRow}>
          <View style={[styles.bullet, { opacity: 0.35 }]} />
          <Text style={styles.bulletText}>Apaise les irritations</Text>
        </View>
        <View style={styles.bulletRow}>
          <View style={[styles.bullet, { opacity: 0.45 }]} />
          <Text style={styles.bulletText}>Renforce la barrière cutanée</Text>
        </View>
        <View style={styles.bulletRow}>
          <View style={[styles.bullet, { opacity: 0.25 }]} />
          <Text style={styles.bulletText}>Convient aux peaux sensibles</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4", paddingTop: 20 },
  pageContent: { padding: 16, paddingBottom: 26, gap: 14 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  topTitle: { fontSize: 16, fontWeight: "800", color: "#3F3B37" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18, color: "#3F3B37" },

  heroCard: {
    borderRadius: 22,
    backgroundColor: "#F4E4DE",
    overflow: "hidden",
  },
  heroImage: { width: "100%", height: 260 },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },

  card: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.75)",
    padding: 16,
  },

  title: { fontSize: 26, fontWeight: "900", color: "#3F3B37" },
  desc: { marginTop: 6, color: "rgba(63,59,55,0.65)", fontSize: 14, lineHeight: 18 },

  scoreRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  dot: { width: 10, height: 10, borderRadius: 99, backgroundColor: "#D9EFE6" },
  scoreText: { fontSize: 18, color: "#3F3B37" },
  scoreStrong: { fontWeight: "900" },
  starRow: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 8 },
  star: { fontSize: 16 },
  starOn: { color: "#E3B200" },
  starOff: { color: "rgba(0,0,0,0.18)" },
  ratingText: { marginLeft: 6, color: "rgba(63,59,55,0.55)", fontSize: 14 },

  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#3F3B37", marginBottom: 10 },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  chipNeutral: { backgroundColor: "rgba(0,0,0,0.04)" },
  chipAccent: { backgroundColor: "rgba(234, 170, 148, 0.55)" },
  chipText: { color: "#3F3B37", fontWeight: "700" },
  moreBtn: {
    marginTop: 12,
  },

  moreText: { marginTop: 10, color: "rgba(63,59,55,0.55)",fontWeight: "700", },

  bulletRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  bullet: { width: 8, height: 8, borderRadius: 99, backgroundColor: "#CFE9DE" },
  bulletText: { color: "rgba(63,59,55,0.75)", fontSize: 15 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#FBF8F4" },
  muted: { marginTop: 10, color: "rgba(63,59,55,0.6)" },
  errorTitle: { fontSize: 18, fontWeight: "900", color: "#B42318", marginBottom: 6 },

  btn: {
    marginTop: 16,
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  btnText: { fontWeight: "800", color: "#3F3B37" },
  imageModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  
  fullImage: {
    width: "100%",
    height: "100%",
  },
  
  imageModalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  
  imageModalCloseText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  notFoundPage: {
    flex: 1,
    backgroundColor: "#F7F1EA", // warm beige like screenshot
    paddingHorizontal: 22,
    paddingTop: 70,
    alignItems: "center",
  },
  
  notFoundTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#4E4E4E",
    textAlign: "center",
  },
  
  notFoundSub: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 26,
    color: "rgba(63,59,55,0.70)",
    textAlign: "center",
  },
  
  notFoundArt: {
    marginTop: 26,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  
  notFoundHint: {
    marginTop: 8,
    fontSize: 18,
    lineHeight: 26,
    color: "rgba(63,59,55,0.70)",
    textAlign: "center",
  },
  
  uploadBox: {
    marginTop: 18,
    width: "100%",
    height: 130,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "rgba(63,59,55,0.35)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  
  uploadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(63,59,55,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  
  uploadIcon: {
    fontSize: 26,
  },
  
  backBtn: {
    marginTop: 22,
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  
  backBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#3F3B37",
  },
});
