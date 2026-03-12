import React from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useProductsByFlag } from "../hooks/useProduct";
import type { Product } from "../types/product";
import HeartIcon from  "../../assets/icons/heart.svg"
export function FlagRow({
  flagId,
  onOpen,
}: {
  flagId: number;
  onOpen: (ean: string) => void;
}) {
  const { data, isLoading, isError, error } = useProductsByFlag(flagId);

  const payload = data as any;
  const items: Product[] = Array.isArray(payload) ? payload : payload?.data ?? [];

  return (
    <View style={styles.wrap}>

      {isLoading ? (
        <ActivityIndicator style={{ marginVertical: 10 }} />
      ) : isError ? (
        <Text style={styles.errorText}>{(error as any)?.message || "Erreur de chargement"}</Text>
      ) : (
        <FlatList
          data={items}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.uid)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ProductRowCard item={item} onPress={() => onOpen(item.ean)} />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun produit</Text>}
        />
      )}
    </View>
  );
}

function ProductRowCard({ item, onPress }: { item: Product; onPress: () => void }) {
  const thumb =
    item.images?.[0]?.thumbnail ||
    item.images?.[0]?.image ||
    "";

  const score = typeof item.validScore === "number" ? `${item.validScore}/20` : "—/20";
  const subtitle = item.brand?.name || item.category?.name || "";

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={styles.thumbFallback} />
        )}
      </View>

      {/* Text */}
      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={styles.title}>
          {item.name}
        </Text>

        {!!subtitle && (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}

        <View style={styles.scoreRow}>
          <View style={styles.scoreDot} />
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>

      {/* Heart (static for now) */}
      {/* <View style={styles.heartWrap}>
        <HeartIcon></HeartIcon>
      </View> */}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#3F3B37",
    marginBottom: 10,
    marginLeft: 2,
  },

  listContent: { paddingRight: 6 },

  card: {
    width: 320, // looks like screenshot
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",

    // soft shadow
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.04)",
    marginRight: 12,
  },
  thumb: { width: "100%", height: "100%" },
  thumbFallback: { flex: 1 },

  cardBody: { flex: 1, gap: 6 },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#3F3B37",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(63,59,55,0.55)",
    fontWeight: "600",
  },

  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  scoreDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: "rgba(120, 160, 190, 0.35)", // soft blue dot like screenshot
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(63,59,55,0.65)",
  },

  heartWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  heart: {
    fontSize: 20,
    color: "rgba(63,59,55,0.55)",
    fontWeight: "700",
  },

  errorText: { color: "#B42318", fontWeight: "800", marginTop: 8 },
  emptyText: { color: "rgba(63,59,55,0.65)", fontWeight: "700", marginTop: 4 },
});
