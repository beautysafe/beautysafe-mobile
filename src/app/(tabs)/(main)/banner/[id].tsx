import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  View,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useBannerById } from "../../../../hooks/useBanner";

type Step = "title" | "text" | "productsTitle" | "products";

type HtmlSegment = {
  text: string;
  href?: string;
};

type HtmlBlock = {
  type: "h2" | "h3" | "p" | "li";
  segments: HtmlSegment[];
};

const decodeHtml = (text: string) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );

const stripTags = (text: string) => text.replace(/<[^>]*>/g, "");

const cleanText = (text: string) =>
  decodeHtml(stripTags(text)).replace(/\s+/g, " ");

const cleanUrl = (url?: string | null) => {
  if (!url) return undefined;

  const cleaned = decodeHtml(url).trim();

  if (!cleaned) return undefined;

  if (cleaned.startsWith("//")) {
    return `https:${cleaned}`;
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  return undefined;
};

const getHref = (tag: string) => {
  const match = tag.match(/href=["']([^"']+)["']/i);
  return cleanUrl(match?.[1]);
};

const parseInlineHtml = (html: string): HtmlSegment[] => {
  const segments: HtmlSegment[] = [];
  const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const before = cleanText(html.slice(lastIndex, match.index));

    if (before.trim()) {
      segments.push({ text: before });
    }

    const href = getHref(match[1]);
    const linkText = cleanText(match[2]).trim();

    if (linkText) {
      segments.push({ text: linkText, href });
    }

    lastIndex = linkRegex.lastIndex;
  }

  const after = cleanText(html.slice(lastIndex));

  if (after.trim()) {
    segments.push({ text: after });
  }

  return segments;
};

const parseSimpleHtml = (html?: string): HtmlBlock[] => {
  if (!html) return [];

  const blocks: HtmlBlock[] = [];

  const blockRegex = /<(h2|h3|p|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;

  let match;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2];

    if (tag === "ul" || tag === "ol") {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;

      let liMatch;
      let itemIndex = 1;

      while ((liMatch = liRegex.exec(content)) !== null) {
        const prefix = tag === "ol" ? `${itemIndex}. ` : "• ";
        const segments = parseInlineHtml(liMatch[1]);

        const totalText = segments.map((s) => s.text).join("").trim();

        if (totalText) {
          blocks.push({
            type: "li",
            segments: [{ text: prefix }, ...segments],
          });
        }

        itemIndex += 1;
      }

      continue;
    }

    const type = tag as "h2" | "h3" | "p";
    const segments = parseInlineHtml(content);
    const totalText = segments.map((s) => s.text).join("").trim();

    if (totalText) {
      blocks.push({ type, segments });
    }
  }

  return blocks;
};

const getBlockTextLength = (block: HtmlBlock) =>
  block.segments.reduce((total, segment) => total + segment.text.length, 0);

const openLink = (href: string) => {
  Linking.openURL(href).catch((error) => {
    console.warn("Cannot open link:", href, error);
  });
};

const renderSegments = (segments: HtmlSegment[], visibleChars: number) => {
  let remaining = visibleChars;

  return segments.map((segment, index) => {
    if (remaining <= 0) return null;

    const visibleText = segment.text.slice(0, remaining);
    remaining -= visibleText.length;

    if (!visibleText) return null;

    const href = segment.href;

    return (
      <Text
        key={index}
        style={href ? styles.htmlLink : undefined}
        onPress={href ? () => openLink(href) : undefined}
      >
        {visibleText}
      </Text>
    );
  });
};

function TypewriterHtml({
  html,
  speed = 1,
  charsPerTick = 5,
  onDone,
}: {
  html: string;
  speed?: number;
  charsPerTick?: number;
  onDone?: () => void;
}) {
  const blocks = useMemo(() => parseSimpleHtml(html), [html]);

  const [blockIndex, setBlockIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const onDoneRef = useRef<(() => void) | undefined>(onDone);
  const doneRef = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    setBlockIndex(0);
    setCharIndex(0);
    doneRef.current = false;
  }, [html]);

  useEffect(() => {
    if (doneRef.current) return;

    if (!blocks.length) {
      doneRef.current = true;
      onDoneRef.current?.();
      return;
    }

    if (blockIndex >= blocks.length) {
      doneRef.current = true;
      onDoneRef.current?.();
      return;
    }

    const currentBlock = blocks[blockIndex];
    const currentLength = getBlockTextLength(currentBlock);

    const timeout = setTimeout(() => {
      if (charIndex < currentLength) {
        setCharIndex((prev) =>
          Math.min(prev + charsPerTick, currentLength)
        );
      } else {
        setBlockIndex((prev) => prev + 1);
        setCharIndex(0);
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [blocks, blockIndex, charIndex, speed, charsPerTick]);

  return (
    <View>
      {blocks.slice(0, blockIndex).map((block, index) => (
        <Text
          key={index}
          style={
            block.type === "h2"
              ? styles.htmlH2
              : block.type === "h3"
              ? styles.htmlH3
              : block.type === "li"
              ? styles.htmlLi
              : styles.htmlP
          }
        >
          {renderSegments(block.segments, getBlockTextLength(block))}
        </Text>
      ))}

      {blocks[blockIndex] ? (
        <Text
          style={
            blocks[blockIndex].type === "h2"
              ? styles.htmlH2
              : blocks[blockIndex].type === "h3"
              ? styles.htmlH3
              : blocks[blockIndex].type === "li"
              ? styles.htmlLi
              : styles.htmlP
          }
        >
          {renderSegments(blocks[blockIndex].segments, charIndex)}
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

  const onDoneRef = useRef<(() => void) | undefined>(onDone);
  const doneRef = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    setDisplayedText("");
    doneRef.current = false;

    if (!text) {
      doneRef.current = true;
      onDoneRef.current?.();
      return;
    }

    let index = 0;

    const interval = setInterval(() => {
      index += 1;
      setDisplayedText(text.slice(0, index));

      if (index >= text.length) {
        clearInterval(interval);

        if (!doneRef.current) {
          doneRef.current = true;
          onDoneRef.current?.();
        }
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
  }, [opacity, delay]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export default function BannerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: banner, isLoading } = useBannerById(id);

  const [step, setStep] = useState<Step>("title");

  useEffect(() => {
    setStep("title");
  }, [id]);

  if (isLoading) {
    return <Text style={styles.loading}>Chargement...</Text>;
  }

  if (!banner) {
    return <Text style={styles.loading}>Bannière introuvable</Text>;
  }

  const hasProducts = !!banner.products?.length;
  const bannerImageUri = cleanUrl(banner.image);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {bannerImageUri ? (
        <Image
          source={{ uri: bannerImageUri }}
          style={styles.heroImage}
          contentFit="fill"
        />
      ) : null}

      <TypewriterText
        text={banner.title || ""}
        style={styles.title}
        speed={35}
        onDone={() => {
          setStep((currentStep) =>
            currentStep === "title" ? "text" : currentStep
          );
        }}
      />

      {step !== "title" && (
        <TypewriterHtml
          html={banner.longDescriptionHtml || ""}
          speed={1}
          charsPerTick={6}
          onDone={() => {
            setStep((currentStep) => {
              if (currentStep !== "text") return currentStep;
              return hasProducts ? "productsTitle" : "products";
            });
          }}
        />
      )}

      {hasProducts &&
        (step === "productsTitle" || step === "products") && (
          <TypewriterText
            text="Produits recommandés"
            style={styles.productsTitle}
            speed={25}
            onDone={() => {
              setStep((currentStep) =>
                currentStep === "productsTitle" ? "products" : currentStep
              );
            }}
          />
        )}

      {hasProducts &&
        step === "products" &&
        banner.products?.map((product, index) => {
          const productImageUri = cleanUrl(
            product.images?.[0]?.thumbnail || product.images?.[0]?.image
          );

          return (
            <FadeInView key={product.uid || product.ean} delay={index * 400}>
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

                {productImageUri ? (
                  <Image
                    source={{ uri: productImageUri }}
                    style={styles.productImage}
                    contentFit="cover"
                  />
                ) : null}
              </Pressable>
            </FadeInView>
          );
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FBF8F4",
  },

  content: {
    padding: 10,
    paddingBottom: 32,
  },

  loading: {
    marginTop: 80,
    textAlign: "center",
    fontSize: 16,
  },

  heroImage: {
    width: "100%",
    height: 230,
    borderRadius: 22,
    marginTop: 22,
    paddingBottom: 0,
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#3F3B37",
    marginBottom: 8,
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

  htmlH3: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3F3B37",
    marginTop: 14,
    marginBottom: 6,
    lineHeight: 25,
  },

  htmlP: {
    fontSize: 15,
    color: "rgba(63,59,55,0.75)",
    lineHeight: 23,
    marginBottom: 12,
  },

  htmlLi: {
    fontSize: 15,
    color: "rgba(63,59,55,0.75)",
    lineHeight: 23,
    marginBottom: 6,
    paddingLeft: 6,
  },

  htmlLink: {
    color: "#2563EB",
    textDecorationLine: "underline",
    fontWeight: "700",
  },

  productName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#3F3B37",
  },

  productMeta: {
    marginTop: 4,
    color: "rgba(63,59,55,0.55)",
  },

  productImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
});