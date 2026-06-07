import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";

import ArrowLeftIcon from "../../../../../../assets/icons/arrow-left.svg";
import { useProductListProductsInfinite } from "../../../../../hooks/useGroups";
import type { Product } from "../../../../../types/product";

function getImage(product: Product) {
  return product.images?.[0]?.thumbnail || product.images?.[0]?.image || null;
}

function ProductCard({ item }: { item: Product }) {
  const router = useRouter();
  const img = getImage(item);

  return (
    <Pressable
      onPress={() => {
        if (item.ean) {
          router.push({ pathname: "/product/[ean]", params: { ean: item.ean } });
        }
      }}
      style={styles.cardWrap}
    >
      <View style={styles.card}>
        {img ? (
          <Image source={{ uri: img }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
        <Text style={styles.title} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.brand?.name || " "}
        </Text>
        <Text style={styles.scoreText}>{item.validScore ?? 0}/20</Text>
      </View>
    </Pressable>
  );
}

export default function ProductListProductsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useProductListProductsInfinite(id, true, 20);

  const products = useMemo(
    () => query.data?.pages.flatMap((page) => page.products ?? []) ?? [],
    [query.data]
  );

  const initialLoading = query.isLoading && products.length === 0;

  if (initialLoading) {
    return (
      <View style={styles.centerPage}>
        <ActivityIndicator />
        <Text style={styles.stateText}>Chargement des produits...</Text>
      </View>
    );
  }

  if (query.isError && products.length === 0) {
    return (
      <View style={styles.centerPage}>
        <Text style={styles.errorTitle}>Impossible de charger les produits.</Text>
        <Pressable onPress={() => query.refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reessayer</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.backTextBtn}>
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeftIcon width={22} height={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Explorer les produits</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item, index) => item.ean || String(item.uid ?? index)}
        numColumns={2}
        columnWrapperStyle={styles.colWrap}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ProductCard item={item} />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucun produit disponible.</Text>
          </View>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4", paddingTop: 34 },
  centerPage: {
    flex: 1,
    backgroundColor: "#FBF8F4",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 44, height: 44 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: "#3F3B37" },
  listContent: { padding: 16, paddingBottom: 24 },
  colWrap: { justifyContent: "space-between" },
  cardWrap: { width: "48%", marginBottom: 14 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  image: { width: "100%", height: 170 },
  imagePlaceholder: { width: "100%", height: 170, backgroundColor: "rgba(0,0,0,0.06)" },
  title: { marginTop: 12, paddingHorizontal: 12, fontSize: 16, fontWeight: "900", color: "#3F3B37" },
  subtitle: {
    marginTop: 6,
    paddingHorizontal: 12,
    color: "rgba(63,59,55,0.55)",
    fontWeight: "700",
  },
  scoreText: { marginTop: 8, paddingHorizontal: 12, color: "rgba(63,59,55,0.6)", fontWeight: "800" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    padding: 18,
  },
  emptyText: { color: "rgba(63,59,55,0.6)", fontWeight: "700" },
  footerLoader: { paddingVertical: 16 },
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
