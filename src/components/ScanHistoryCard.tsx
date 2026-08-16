import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ScanEvent } from "../api/scansApi";

type ScanHistoryCardProps = {
  scan: ScanEvent;
  compact?: boolean;
  onPress: () => void;
};

export function formatScanDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date indisponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function ScanHistoryCard({
  scan,
  compact = false,
  onPress,
}: ScanHistoryCardProps) {
  const { product } = scan;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, compact ? styles.compactCard : styles.rowCard]}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${product.name}`}
    >
      <View
        style={compact ? styles.compactImageWrap : styles.rowImageWrap}
      >
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            contentFit="contain"
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={30} color="#9C9A96" />
          </View>
        )}
      </View>

      <View style={compact ? styles.compactContent : styles.rowContent}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand?.name || "BeautySafe"}
        </Text>
        <Text style={styles.name} numberOfLines={compact ? 2 : 1}>
          {product.name || "Produit"}
        </Text>
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={14} color="#69716F" />
          <Text style={styles.date} numberOfLines={1}>
            {formatScanDate(scan.scannedAt)}
          </Text>
        </View>
      </View>

      {!compact ? (
        <Ionicons name="chevron-forward" size={20} color="#69716F" />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
  },
  compactCard: {
    width: 176,
    padding: 12,
  },
  rowCard: {
    minHeight: 128,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  compactImageWrap: {
    width: "100%",
    height: 126,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F7F1EA",
  },
  rowImageWrap: {
    width: 104,
    height: 104,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F7F1EA",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  compactContent: {
    paddingTop: 10,
    gap: 4,
  },
  rowContent: {
    flex: 1,
    gap: 5,
  },
  brand: {
    color: "#7B817F",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  name: {
    color: "#3F3B37",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  date: {
    flexShrink: 1,
    color: "#69716F",
    fontSize: 11,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
  },
});
