import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Dimensions } from "react-native";
import { useBannerById } from "../../../../hooks/useBanner";
import RenderHtml from "@native-html/render";

const { width } = Dimensions.get("window");

type HtmlBlock = {
  type: "h2" | "p";
  text: string;
};

const decodeHtml = (text: string) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const parseSimpleHtml = (html?: string): HtmlBlock[] => {
  if (!html) return [];

  const blocks: HtmlBlock[] = [];
  const regex = /<(h2|p)[^>]*>(.*?)<\/\1>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    const type = match[1].toLowerCase() as "h2" | "p";
    const text = decodeHtml(match[2].replace(/<[^>]*>/g, "").trim());

    if (text) {
      blocks.push({ type, text });
    }
  }

  return blocks;
};

function TypewriterHtml({
  html,
  speed = 10,
  onDone,
}: {
  html: string;
  speed?: number;
  onDone?: () => void;
}) {
  const blocks = parseSimpleHtml(html);

  const [blockIndex, setBlockIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    setBlockIndex(0);
    setCharIndex(0);
  }, [html]);

  useEffect(() => {
    if (!blocks.length) {
      onDone?.();
      return;
    }

    if (blockIndex >= blocks.length) {
      onDone?.();
      return;
    }

    const currentBlock = blocks[blockIndex];

    const timeout = setTimeout(() => {
      if (charIndex < currentBlock.text.length) {
        setCharIndex((prev) => prev + 1);
      } else {
        setBlockIndex((prev) => prev + 1);
        setCharIndex(0);
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [blocks, blockIndex, charIndex, speed]);

  return (
    <View>
      {blocks.slice(0, blockIndex).map((block, index) => (
        <Text
          key={index}
          style={block.type === "h2" ? styles.htmlH2 : styles.htmlP}
        >
          {block.text}
        </Text>
      ))}

      {blocks[blockIndex] ? (
        <Text
          style={
            blocks[blockIndex].type === "h2" ? styles.htmlH2 : styles.htmlP
          }
        >
          {blocks[blockIndex].text.slice(0, charIndex)}
        </Text>
      ) : null}
    </View>
  );
}
function TypewriterText({
  text,
  speed = 25,
  style,
  onDone,
}: {
  text: string;
  speed?: number;
  style?: any;
  onDone?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");

    if (!text) {
      onDone?.();
      return;
    }

    let index = 0;

    const interval = setInterval(() => {
      index += 1;
      setDisplayedText(text.slice(0, index));

      if (index >= text.length) {
        clearInterval(interval);
        onDone?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <Text style={style}>{displayedText}</Text>;
}

function FadeInView({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 450,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export default function BannerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: banner, isLoading } = useBannerById(id);

  const [step, setStep] = useState<
    "title" | "text" | "productsTitle" | "products"
  >("title");

  if (isLoading) {
    return <Text style={styles.loading}>Chargement...</Text>;
  }

  if (!banner) {
    return <Text style={styles.loading}>Bannière introuvable</Text>;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Image
        source={require("../../../../../assets/img/winter.png")}
        style={styles.heroImage}
        contentFit="cover"
      />

      <TypewriterText
        text={banner.title}
        style={styles.title}
        speed={35}
        onDone={() => {
          setStep("text");

          setTimeout(() => {
            setStep("productsTitle");
          }, 1200);
        }}
      />

      {step !== "title" && (
        <TypewriterHtml
          html={banner.longDescriptionHtml || ""}
          speed={8}
          onDone={() => setStep("productsTitle")}
        />
      )}

      {banner.products?.length && step !== "title" && step !== "text" ? (
        <>
          <TypewriterText
            text="Produits recommandés"
            style={styles.productsTitle}
            speed={35}
            onDone={() => setStep("products")}
          />

          {step === "products" &&
            banner.products.map((product, index) => (
              <FadeInView key={product.uid} delay={index * 400}>
                <Pressable
                  style={styles.productCard}
                  onPress={() =>
                    router.push({
                      pathname: "/product/[ean]",
                      params: { ean: product.ean },
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productMeta}>
                      {product.brand?.name || "—"} • EAN {product.ean}
                    </Text>
                  </View>

                  {product.images?.[0]?.thumbnail ||
                  product.images?.[0]?.image ? (
                    <Image
                      source={{
                        uri:
                          product.images?.[0]?.thumbnail ||
                          product.images?.[0]?.image,
                      }}
                      style={styles.productImage}
                      contentFit="cover"
                    />
                  ) : null}
                </Pressable>
              </FadeInView>
            ))}
        </>
      ) : null}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4" },
  content: { padding: 16, paddingBottom: 32 },
  loading: { marginTop: 80, textAlign: "center", fontSize: 16 },
  heroImage: { width: "100%", height: 230, borderRadius: 22, marginBottom: 18 },
  title: { fontSize: 26, fontWeight: "900", color: "#3F3B37", marginBottom: 8 },
  short: {
    fontSize: 15,
    color: "rgba(63,59,55,0.7)",
    lineHeight: 22,
    marginBottom: 18,
  },
  productsTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#3F3B37",
    marginTop: 22,
    marginBottom: 12,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  htmlH2: {
    fontSize: 21,
    fontWeight: "900",
    color: "#3F3B37",
    marginTop: 18,
    marginBottom: 8,
    lineHeight: 28,
  },

  htmlP: {
    fontSize: 15,
    color: "rgba(63,59,55,0.75)",
    lineHeight: 23,
    marginBottom: 12,
  },
  productName: { fontSize: 15, fontWeight: "800", color: "#3F3B37" },
  productMeta: { marginTop: 4, color: "rgba(63,59,55,0.55)" },
  productImage: { width: 64, height: 64, borderRadius: 12 },
});
