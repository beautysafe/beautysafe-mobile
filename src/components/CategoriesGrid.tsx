import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

export type HomeCategory = {
  id: string;
  name: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
};

type Props = {
  items: HomeCategory[];
  onPress?: (cat: HomeCategory) => void;
};

function getSubtitle(cat: HomeCategory) {
  if (cat.title?.trim()) return cat.title.trim();
  if (!cat.description?.trim()) return "";
  return cat.description.trim();
}

export function CategoriesGrid({ items, onPress }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Catégories</Text>

      <View style={styles.list}>
        {items.map((cat) => {
          const subtitle = getSubtitle(cat);

          return (
            <Pressable
              key={cat.id}
              onPress={() => onPress?.(cat)}
              style={({ pressed }) => [
                styles.cardOuter,
                pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 },
              ]}
            >
              <View style={styles.card}>
                {cat.imageUrl ? (
                  <Image
                    source={{ uri: cat.imageUrl }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={["#F8DAD5", "#EEF9F4"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}

                <LinearGradient
                  colors={[
                    "rgba(255,255,255,0.92)",
                    "rgba(255,255,255,0.7)",
                    "rgba(255,255,255,0.08)",
                  ]}
                  locations={[0, 0.46, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.overlay}
                >
                  <View style={styles.copy}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    {subtitle ? (
                      <Text style={styles.cardSubtitle} numberOfLines={2}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.arrowButton}>
                    <Text style={styles.arrowText}>{">"}</Text>
                  </View>
                </LinearGradient>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 0 },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#3F3B37",
    marginBottom: 16,
  },
  list: { gap: 14 },
  cardOuter: {
    width: "100%",
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    backgroundColor: "#FFFFFF",
  },
  card: {
    height: 154,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#EEF9F4",
  },
  overlay: {
    flex: 1,
    paddingLeft: 22,
    paddingRight: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copy: {
    flex: 1,
    paddingRight: 18,
  },
  cardTitle: {
    color: "#3F3B37",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  cardSubtitle: {
    marginTop: 8,
    color: "rgba(63,59,55,0.82)",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    maxWidth: "86%",
  },
  arrowButton: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  arrowText: {
    color: "#3F3B37",
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "500",
  },
});
