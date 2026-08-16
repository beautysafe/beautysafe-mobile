import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const KEY = "hasOnboarded";

const SLIDES = [
  {
    key: "1",
    title: "Bienvenue dans votre guide des ingrédients cosmétiques",
    subtitle:
      "Cette application vous aide à comprendre la composition des produits de beauté et à faire des choix plus éclairés pour votre peau.",
    image: require("../../../assets/Onboarding-1.png"),
  },
  {
    key: "2",
    title: "Scannez et identifiez les produits facilement",
    subtitle:
      "Scannez un code-barres ou une étiquette pour accéder rapidement à la liste complète des ingrédients et à leur niveau de sécurité.",
    image: require("../../../assets/Onboarding-2.png"),
  },
  {
    key: "3",
    title: "Faites des choix plus sûrs au quotidien",
    subtitle:
      "Découvrez des produits, les compositions et trouvez des cosmétiques adaptés à vos besoins et préférences.",
    image: require("../../../assets/Onboarding-3.png"),
  },
] as const;

type Slide = (typeof SLIDES)[number];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  const [screenHeight, setScreenHeight] = useState(height);
  const [index, setIndex] = useState(0);

  const listRef = useRef<Animated.FlatList<Slide>>(null);

  const x = useSharedValue(0);

  useEffect(() => {
    AsyncStorage.removeItem(KEY);
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      x.value = e.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.[0]?.index != null) {
      setIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useMemo(
    () => ({
      viewAreaCoveragePercentThreshold: 60,
    }),
    []
  );

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(KEY, "1");

    router.replace("/(main)");
  }, []);

  const next = useCallback(() => {
    const nextIndex = Math.min(index + 1, SLIDES.length - 1);

    listRef.current?.scrollToOffset({
      offset: nextIndex * width,
      animated: true,
    });
  }, [index]);

  return (
    <View
      style={styles.root}
      onLayout={(event) => {
        const actualHeight = event.nativeEvent.layout.height;

        if (actualHeight > 0 && actualHeight !== screenHeight) {
          setScreenHeight(actualHeight);
        }
      }}
    >
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        style={styles.list}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index: i }) => (
          <SlideItem
            item={item}
            i={i}
            x={x}
            screenHeight={screenHeight}
          />
        )}
      />

      {/* Bottom controls */}
      <View
        style={[
          styles.controls,
          {
            bottom: Math.max(insets.bottom + 18, 34),
          },
        ]}
      >
        {/* Pagination */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <Dot key={i} i={i} x={x} />
          ))}
        </View>

        {/* Button */}
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

function SlideItem({
  item,
  i,
  x,
  screenHeight,
}: {
  item: Slide;
  i: number;
  x: Animated.SharedValue<number>;
  screenHeight: number;
}) {
  const titleStyle = useAnimatedStyle(() => {
    const start = (i - 1) * width;
    const mid = i * width;
    const end = (i + 1) * width;

    const opacity = interpolate(
      x.value,
      [start, mid, end],
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      x.value,
      [start, mid, end],
      [20, 0, -20],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const subStyle = useAnimatedStyle(() => {
    const start = (i - 1) * width;
    const mid = i * width;
    const end = (i + 1) * width;

    const opacity = interpolate(
      x.value,
      [start, mid, end],
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      x.value,
      [start, mid, end],
      [12, 0, -12],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <View
      style={[
        styles.slide,
        {
          height: screenHeight,
        },
      ]}
    >
      <Image
        source={item.image}
        style={styles.bg}
        contentFit="cover"
        contentPosition="center"
      />

      {/* Very light general overlay */}
      <View style={styles.imageOverlay} />

      {/* Dark gradient for readable text */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0)",
          "rgba(0,0,0,0.10)",
          "rgba(0,0,0,0.55)",
          "rgba(0,0,0,0.82)",
        ]}
        locations={[0, 0.38, 0.7, 1]}
        style={styles.bottomGradient}
      />

      {/* Text */}
      <View style={styles.textWrap}>
        <Animated.Text style={[styles.title, titleStyle]}>
          {item.title}
        </Animated.Text>

        {/* <Animated.Text style={[styles.subtitle, subStyle]}>
          {item.subtitle}
        </Animated.Text> */}
      </View>
    </View>
  );
}

function Dot({
  i,
  x,
}: {
  i: number;
  x: Animated.SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const start = (i - 1) * width;
    const mid = i * width;
    const end = (i + 1) * width;

    const dotWidth = interpolate(
      x.value,
      [start, mid, end],
      [8, 28, 8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      x.value,
      [start, mid, end],
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );

    return {
      width: dotWidth,
      opacity,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },

  list: {
    flex: 1,
  },

  slide: {
    width,
    position: "relative",
    backgroundColor: "#000",
  },

  bg: {
    ...StyleSheet.absoluteFillObject,
  },

  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.02)",
  },

  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%",
  },

  textWrap: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: Platform.OS === "android" ? 190 : 180,
  },

  title: {
    fontFamily: "Averia Serif Libre",
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
    width: "100%",

    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 5,
  },

  subtitle: {
    marginTop: 14,
    fontFamily: "Averia Serif Libre",
    fontSize: 15,
    lineHeight: 21,
    color: "rgba(255,255,255,0.9)",
    width: "100%",

    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 3,
  },

  controls: {
    position: "absolute",
    left: 22,
    right: 22,
    gap: 18,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  dot: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },

  cta: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.94)",

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 5,
  },

  ctaText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#4A362B",
  },
});