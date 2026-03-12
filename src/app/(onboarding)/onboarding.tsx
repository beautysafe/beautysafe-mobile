import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");
const KEY = "hasOnboarded";


const SLIDES = [
  {
    key: "1",
    title: "Bienvenue\ndans votre\nguide des\ningrédients\ncosmétiques",
    subtitle:
      "Cette application vous aide à comprendre la composition des produits de beauté et à faire des choix plus éclairés pour votre peau.",
    image: require("../../../assets/Onboarding-1.png"),
  },
  {
    key: "2",
    title: "Scannez\net identifiez\nles produits\nfacilement",
    subtitle:
      "Scannez un code-barres ou une étiquette pour accéder rapidement à la liste complète des ingrédients et à leur niveau de sécurité.",
    image: require("../../../assets/Onboarding-2.png"),
  },
  {
    key: "3",
    title: "Faites des\nchoix plus\nsûrs au\nquotidien",
    subtitle:
      "Découvrez des produits, les compositions et trouvez des cosmétiques adaptés à vos besoins et préférences.",
    image: require("../../../assets/Onboarding-3.png"),
  },
] as const;

type Slide = (typeof SLIDES)[number];

export default function OnboardingScreen() {
  useEffect(() => {
    AsyncStorage.removeItem("hasOnboarded");
  }, []);
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const x = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      x.value = e.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const viewabilityConfig = useMemo(
    () => ({ viewAreaCoveragePercentThreshold: 60 }),
    []
  );

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(KEY, "1");
    router.replace("/(main)");
  }, []);

  const next = useCallback(() => {
    const nextIndex = Math.min(index + 1, SLIDES.length - 1);
    listRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
  }, [index]);

  const progressStyle = useAnimatedStyle(() => {
    const p = x.value / (width * (SLIDES.length - 1)); // 0..1
    return {
      width: withTiming(`${Math.max(0, Math.min(1, p)) * 100}%`, { duration: 180 }),
    } as any;
  });

  return (
    <View style={styles.root}>
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index: i }) => (
          <SlideItem item={item} i={i} x={x} />
        )}
      />

      {/* Top actions */}
      {/* <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.topBtn}>
          <Text style={styles.topBtnText}> </Text>
        </Pressable>

        <Pressable onPress={finish} style={styles.topBtn}>
          <Text style={styles.topBtnText}>Passer</Text>
        </Pressable>
      </View> */}

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        {/* <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View> */}

        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <Dot key={i} i={i} x={x} />
          ))}
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottom}>
        {index < SLIDES.length - 1 ? (
          <Pressable onPress={next} style={styles.cta}>
            <Text style={styles.ctaText}>Suivant</Text>
          </Pressable>
        ) : (
          <Pressable onPress={finish} style={styles.cta}>
            <Text style={styles.ctaText}>Commencer</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function SlideItem({ item, i, x }: { item: Slide; i: number; x: Animated.SharedValue<number> }) {
  const titleStyle = useAnimatedStyle(() => {
    const start = (i - 1) * width;
    const mid = i * width;
    const end = (i + 1) * width;

    const opacity = interpolate(x.value, [start, mid, end], [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(x.value, [start, mid, end], [18, 0, -18], Extrapolation.CLAMP);

    return { opacity, transform: [{ translateY }] };
  });

  const subStyle = useAnimatedStyle(() => {
    const start = (i - 1) * width;
    const mid = i * width;
    const end = (i + 1) * width;

    const opacity = interpolate(x.value, [start, mid, end], [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(x.value, [start, mid, end], [10, 0, -10], Extrapolation.CLAMP);

    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={styles.slide}>
      <Image source={item.image} style={styles.bg} contentFit="cover" />
      <View style={styles.overlay} />

      <View style={styles.textWrap}>
        <Animated.Text style={[styles.title, titleStyle]}>{item.title}</Animated.Text>
        <Animated.Text style={[styles.subtitle, subStyle]}>{item.subtitle}</Animated.Text>
      </View>
    </View>
  );
}

function Dot({ i, x }: { i: number; x: Animated.SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const start = (i - 1) * width;
    const mid = i * width;
    const end = (i + 1) * width;

    const w = interpolate(x.value, [start, mid, end], [8, 26, 8], Extrapolation.CLAMP);
    const o = interpolate(x.value, [start, mid, end], [0.25, 0.7, 0.25], Extrapolation.CLAMP);

    return { width: w, opacity: o };
  });

  return <Animated.View style={[styles.dot, st]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1EC" },

  slide: { width, height, position: "relative" },
  bg: { ...StyleSheet.absoluteFillObject },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },

  textWrap: {
    position: "absolute",
    left: 26,
    right: 26,
    top: height * 0.20,
  },

  title: {
    fontFamily: "Averia Serif Libre",
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "800",
    color: "#4A362B",
    letterSpacing: 0.2,
  },

  subtitle: {
    marginTop: 18,
    fontFamily: "Averia Serif Libre",
    fontSize: 14.5,
    lineHeight: 20,
    color: "rgba(74,54,43,0.75)",
    maxWidth: 320,
  },

  topRow: {
    position: "absolute",
    top: 54,
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  topBtnText: { fontWeight: "800", color: "rgba(74,54,43,0.85)" },

  progressWrap: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: 110,
    gap: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.10)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(120, 90, 40, 0.55)",
  },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(120, 90, 40, 0.55)",
  },

  bottom: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: 42,
  },
  cta: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 16, fontWeight: "900", color: "#4A362B" },
});
