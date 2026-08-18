import React, { useEffect, useMemo  } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../../components/AuthProvider";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import ArrowLeftIcon from  "../../../../assets/icons/arrow-left.svg"
import CloseIcon from  "../../../../assets/icons/close.svg"
import NoFavorite from "../../../../assets/noFavorite.svg";
import { useFavorites} from "../../../hooks/useFavorites";
import { FavoriteProduct } from "../../../types/user";
import ProductListBannerAd from "../../../components/ads/product-list-banner-ad";

function FavoritesEmpty() {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>Aucun favori pour le moment</Text>

      <Text style={styles.emptySub}>
        Vous n’avez pas encore ajouté de produits à vos favoris.
      </Text>

      <View style={styles.emptyArt}>
        <NoFavorite width={260} height={260} />
      </View>

      <Text style={styles.emptyHint}>
        Explorez les produits et enregistrez ceux qui vous intéressent.
      </Text>
    </View>
  );
}
export default function FavoritesScreen() {
  const router = useRouter();
  const { token, loading } = useAuth();

  // NEW merged hook
  const {
    favorites,
    removeFavorite,
    isLoading,
    isError,
    error,
    isMutating,
  } = useFavorites(!!token);

  const items: FavoriteProduct[] = useMemo(() => {
    return (favorites ?? []) as FavoriteProduct[];
  }, [favorites]);

  const openProduct = (p: FavoriteProduct) => {
    if (p.ean) {
      router.push({
        pathname: "/(tabs)/(main)/product/[ean]",
        params: {
          ean: p.ean,
          returnTo: "/(tabs)/(main)/favori",
        },
      });
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!token) router.replace("/(auth)/login");
  }, [token, loading]);

  if (!token) return null;

  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeftIcon />
        </Pressable>
        <Text style={styles.topTitle}>Produit préféré</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Chargement...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {(error as any)?.message || "Erreur de chargement"}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={items}
          keyExtractor={(it) => String(it.uid)}
          numColumns={2}
          columnWrapperStyle={{ gap: 14 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 14 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<FavoritesEmpty />}
          renderItem={({ item }) => {
            const img = item.images?.[0]?.image || item.images?.[0]?.thumbnail;
            const subtitle = item.brand?.name ? item.brand.name : " ";

            const onRemove = async () => {
              // item.uid is productUid in your favorites list (as used before)
              await removeFavorite(item.uid);
            };

            return (
              <Pressable onPress={() => openProduct(item)} style={styles.card}>
                <Pressable
                  onPress={onRemove}
                  style={styles.closeBtn}
                  hitSlop={10}
                  disabled={isMutating}
                >
                  <CloseIcon width={22} height={22} />
                </Pressable>

                <View style={styles.imageWrap}>
                  {img ? (
                    <Image source={{ uri: img }} style={styles.image} contentFit="cover" />
                  ) : (
                    <View style={[styles.image, styles.noImg]} />
                  )}
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.cardSub} numberOfLines={2}>
                  {subtitle}
                </Text>

                {typeof item.validScore === "number" ? (
                  <View style={styles.scoreRow}>
                    <View style={styles.dot} />
                    {/* <Text style={styles.scoreText}>{item.validScore}/20</Text> */}
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
      <ProductListBannerAd />
    </View>
  );
}

const styles = StyleSheet.create({
page: { flex: 1, backgroundColor: "#FBF8F4", paddingTop: 32 },
list: { flex: 1 },

topBar: {
  paddingHorizontal: 16,
  paddingTop: 10,
  paddingBottom: 6,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},
topTitle: { fontSize: 22, fontWeight: "900", color: "#3F3B37" },
iconBtn: {
  width: 44, height: 44, borderRadius: 999,
  backgroundColor: "rgba(0,0,0,0.04)",
  alignItems: "center", justifyContent: "center",
},
iconText: { fontSize: 18, fontWeight: "900", color: "rgba(63,59,55,0.75)" },

center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
muted: { marginTop: 8, color: "rgba(63,59,55,0.6)", textAlign: "center" },

card: {
  flex: 1,
  backgroundColor: "rgb(255, 255, 255)",
  borderRadius: 22,
  padding: 12,
  minHeight: 260,
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
},

closeBtn: {
  position: "absolute",
  right: 10,
  top: 10,
  width: 30,
  height: 30,
  borderRadius: 999,
  backgroundColor: "rgba(0,0,0,0.06)",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3,
},
closeBtnText: { fontSize: 22, fontWeight: "900", color: "rgba(63,59,55,0.8)", lineHeight: 22 },

imageWrap: { borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.04)", marginBottom: 10 },
image: { width: "100%", height: 140 },
noImg: { backgroundColor: "rgba(0,0,0,0.05)" },

cardTitle: { fontSize: 18, fontWeight: "900", color: "#3F3B37", marginTop: 6 },
cardSub: { marginTop: 6, color: "rgba(63,59,55,0.6)", fontWeight: "600", lineHeight: 18 },

scoreRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 },
dot: { width: 10, height: 10, borderRadius: 99, backgroundColor: "#D9EFE6" },
scoreText: { fontWeight: "800", color: "rgba(63,59,55,0.7)" },

primaryBtn: {
  marginTop: 14,
  height: 48,
  paddingHorizontal: 18,
  borderRadius: 18,
  backgroundColor: "rgba(0,0,0,0.08)",
  alignItems: "center",
  justifyContent: "center",
},
primaryBtnText: { fontWeight: "900", color: "#3F3B37" },

errorText: { color: "#B42318", fontWeight: "900" },
emptyWrap: {
  flex: 1,
  alignItems: "center",
  paddingHorizontal: 22,
  paddingBottom: 40,
},
emptyTitle: {
  fontSize: 34,
  lineHeight: 40,
  fontWeight: "900",
  color: "rgba(63,59,55,0.78)",
  textAlign: "center",
  marginTop: 12,
},
emptySub: {
  marginTop: 14,
  fontSize: 18,
  lineHeight: 26,
  fontWeight: "700",
  color: "rgba(63,59,55,0.55)",
  textAlign: "center",
},
emptyArt: {

  alignItems: "center",
  justifyContent: "center",
  opacity: 0.95,
},
emptyHint: {
  marginTop: 10,
  fontSize: 18,
  lineHeight: 26,
  fontWeight: "700",
  color: "rgba(63,59,55,0.55)",
  textAlign: "center",
},
});
