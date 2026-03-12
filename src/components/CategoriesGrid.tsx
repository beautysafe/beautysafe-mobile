import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

export type HomeCategory = {
  id: string;
  title: string;
  icon: any;
  gradient: [string, string];
  ring: string; 
};

type Props = {
  items: HomeCategory[];
  onPress?: (cat: HomeCategory) => void;
};

export function CategoriesGrid({ items, onPress }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Catégories</Text>

      <View style={styles.grid}>
        {items.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => onPress?.(cat)}
            style={({ pressed }) => [styles.cardOuter, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]}

          >
            <LinearGradient
              colors={cat.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
            <View style={styles.iconCircle}>
              <Image
                source={typeof cat.icon === "string" ? { uri: cat.icon } : (cat.icon as any)}
                style={[styles.icon, { width: 44, height: 44, borderRadius: 22 }]}
              />
            </View>

            <Text style={styles.cardText} numberOfLines={2}>
              {cat.title}
            </Text>
            </LinearGradient>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 0 },
  title: { fontSize: 20, fontWeight: "900", color: "#3F3B37", marginBottom: 12 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },

  card: {
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
  },
  cardOuter: {
    width: "48%",
    borderRadius: 22,
    // iOS shadow (soft, like design)
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    // Android shadow
    elevation: 6,
    backgroundColor: "transparent",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",
  },
  icon: { width: 22, height: 22 },

  cardText: { flex: 1, fontSize: 14, fontWeight: "800", color: "#3F3B37" },
});
