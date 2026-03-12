import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

export default function ProductDetailLoader() {
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, { opacity: pulse }]}>
        <View style={styles.image} />
        <View style={styles.lineLg} />
        <View style={styles.lineSm} />
        <View style={styles.scoreRow}>
          <View style={styles.dot} />
          <View style={styles.score} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  card: {
    width: "100%",
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  image: {
    height: 220,
    borderRadius: 18,
    backgroundColor: "rgba(63,59,55,0.08)",
  },

  lineLg: {
    height: 18,
    borderRadius: 10,
    backgroundColor: "rgba(63,59,55,0.08)",
    marginTop: 18,
    width: "80%",
  },

  lineSm: {
    height: 14,
    borderRadius: 10,
    backgroundColor: "rgba(63,59,55,0.06)",
    marginTop: 10,
    width: "55%",
  },

  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(63,59,55,0.08)",
  },

  score: {
    height: 14,
    width: 70,
    borderRadius: 10,
    backgroundColor: "rgba(63,59,55,0.08)",
  },
});
