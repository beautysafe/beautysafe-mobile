import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { Image } from "expo-image";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";

import ArrowLeftIcon from "../../../../../assets/icons/arrow-left.svg";
import CameraIcon from "../../../../../assets/icons/camera.svg";
import { useJourneyById } from "../../../../hooks/useGroups";
import { useProductByEan } from "../../../../hooks/useProduct";
import { recordSuccessfulEanSearch } from "../../../../services/ads/interstitial";
import type { JourneyProduct } from "../../../../types/group";

const { width, height } = Dimensions.get("window");
const SCAN_BOX_WIDTH = width * 0.78;
const SCAN_BOX_HEIGHT = 220;

type MatchResult = {
  status: "adapted" | "not-adapted" | "no-product" | "not-enough-info";
  message: string;
};

function productImage(product: JourneyProduct) {
  return (
    product.images?.[0]?.thumbnail ||
    product.images?.[0]?.image ||
    product.imageUrl ||
    product.image ||
    null
  );
}

function productMeta(product: JourneyProduct) {
  return (
    product.brand?.name ||
    product.type ||
    (product.validScore ? `${product.validScore}/20` : " ")
  );
}

function debugBack(label: string, details: Record<string, unknown>) {
  if (__DEV__) {
    console.debug(`[nav:${label}]`, details);
  }
}

function goBack(router: ReturnType<typeof useRouter>, returnTo?: string, details = {}) {
  debugBack("journey-back", {
    canGoBack: router.canGoBack(),
    returnTo,
    ...details,
  });

  if (returnTo) {
    router.push(returnTo as any);
    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.push("/(tabs)/(main)");
}

function phaseAccent(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("soir"))
    return { icon: "☾", bg: "#FCF1FA", color: "#6E4A8B" };
  if (lower.includes("apres") || lower.includes("après")) {
    return { icon: "☀", bg: "#EFF9FD", color: "#66ADC0" };
  }
  return { icon: "☀", bg: "#FFF7EA", color: "#F0B43F" };
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function extractIngredients(source: any): any[] {
  const candidates = [
    source?.ingredients,
    source?.ingredientList,
    source?.composition,
    source?.compositions,
    source?.ingredientsList,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function ingredientName(item: any) {
  return (
    item?.name ||
    item?.officialName ||
    item?.title ||
    item?.label ||
    item?.ingredient?.name ||
    item?.ingredientName ||
    ""
  );
}

function ingredientDescription(item: any) {
  return (
    item?.description ||
    item?.benefit ||
    item?.shortDescription ||
    item?.text ||
    ""
  );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlToText(html?: string | null) {
  if (!html) return "";

  return decodeHtmlEntities(html)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|h[1-6])\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\/\s*li\s*>/gi, "")
    .replace(/<\/\s*(ul|ol)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function compareIngredients(product: any, journey: any): MatchResult {
  if (!product) {
    return {
      status: "no-product",
      message: "Nous n'avons pas d'information sur ce produit.",
    };
  }

  const productIngredients = extractIngredients(product);
  const journeyIngredients = extractIngredients(journey);

  if (!productIngredients.length) {
    return {
      status: "not-enough-info",
      message: "Nous n'avons pas assez d'information sur ce produit.",
    };
  }

  if (!journeyIngredients.length) {
    return {
      status: "not-enough-info",
      message:
        "Aucun ingredient de reference n'est renseigne pour cette routine.",
    };
  }

  const journeyIds = new Set(
    journeyIngredients
      .map((item) => item?.id ?? item?.ingredientId ?? item?.uid)
      .filter((value) => value !== undefined && value !== null)
      .map(String),
  );
  const journeyNames = new Set(
    journeyIngredients
      .map((item) => normalizeText(ingredientName(item)))
      .filter(Boolean),
  );

  const hasMatch = productIngredients.some((item) => {
    const id = item?.id ?? item?.ingredientId ?? item?.uid;
    if (id !== undefined && id !== null && journeyIds.has(String(id)))
      return true;

    const name = normalizeText(ingredientName(item));
    return !!name && journeyNames.has(name);
  });

  return hasMatch
    ? { status: "adapted", message: "Ce produit est adapte a votre routine." }
    : {
        status: "not-adapted",
        message: "Ce produit n'est pas adapte a votre routine.",
      };
}

function ProductStep({
  product,
  index,
  onPress,
}: {
  product: JourneyProduct;
  index: number;
  onPress: () => void;
}) {
  const img = productImage(product);
  return (
    <Pressable style={styles.productCard} onPress={onPress}>
      <View style={styles.stepPill}>
        <Text style={styles.stepPillText}>{index + 1}</Text>
      </View>
      {img ? (
        <Image
          source={{ uri: img }}
          style={styles.productImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.productImagePlaceholder} />
      )}
      <Text style={styles.productName} numberOfLines={2}>
        {product.name || "Produit"}
      </Text>
      <Text style={styles.productMeta} numberOfLines={1}>
        {productMeta(product)}
      </Text>
    </Pressable>
  );
}

export default function JourneyDetailScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const returnToPath = typeof returnTo === "string" ? returnTo : undefined;
  const currentReturnPath = `/(tabs)/(main)/journeys/${id}${
    returnToPath ? `?returnTo=${encodeURIComponent(returnToPath)}` : ""
  }`;
  const { data: journey, isLoading, isError, refetch } = useJourneyById(id);
  const [showScanner, setShowScanner] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [scanned, setScanned] = useState(false);
  const [scannedEan, setScannedEan] = useState("");
  const [showResult, setShowResult] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const countedScanRef = useRef(false);

  const productQuery = useProductByEan(scannedEan, { enabled: !!scannedEan });
  const scannedProduct = productQuery.data as any;
  const scannedProductImage =
    scannedProduct?.images?.[0]?.thumbnail ||
    scannedProduct?.images?.[0]?.image ||
    scannedProduct?.image ||
    null;

  const phases = useMemo(
    () =>
      [...(journey?.phases ?? [])].sort(
        (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
      ),
    [journey?.phases],
  );
  const ingredients = useMemo(() => extractIngredients(journey), [journey]);
  const scanResult = useMemo(
    () => compareIngredients(scannedProduct, journey),
    [scannedProduct, journey],
  );

  useEffect(() => {
    if (!showScanner) return;
    setScanned(false);

    if (hasCameraPermission === null) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasCameraPermission(status === "granted");
      })();
    }
  }, [showScanner, hasCameraPermission]);

  useEffect(() => {
    if (!showScanner) return;

    scanLineAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [showScanner, scanLineAnim]);

  useEffect(() => {
    if (!scannedEan || productQuery.isFetching) return;

    if (scannedProduct && productQuery.isSuccess) {
      setShowResult(true);

      if (!countedScanRef.current) {
        countedScanRef.current = true;
        recordSuccessfulEanSearch();
      }

      return;
    }

    if (productQuery.isError) setShowResult(true);
  }, [
    scannedEan,
    scannedProduct,
    productQuery.isError,
    productQuery.isFetching,
    productQuery.isSuccess,
  ]);

  const openScanner = () => {
    setScannedEan("");
    setShowResult(false);
    setShowScanner(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setShowScanner(false);

    const code = String(data || "").trim();
    if (code) {
      countedScanRef.current = false;
      setScannedEan(code);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerPage}>
        <ActivityIndicator />
        <Text style={styles.stateText}>Chargement de votre routine...</Text>
      </View>
    );
  }

  if (isError || !journey) {
    return (
      <View style={styles.centerPage}>
        <Text style={styles.errorTitle}>Impossible de charger la routine.</Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reessayer</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            goBack(router, returnToPath, {
              pathname,
              params: { id, returnTo },
              source: "error-state",
            })
          }
          style={styles.backTextBtn}
        >
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            goBack(router, returnToPath, {
              pathname,
              params: { id, returnTo },
              source: "header",
            })
          }
          style={styles.iconBtn}
        >
          <ArrowLeftIcon width={22} height={22} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {journey.title || "Ma routine"}
        </Text>
        <View style={styles.iconSpacer} />
      </View>

      <Text style={styles.subtitle}>
        {journey.description ||
          "Decouvrez votre routine ideale, adaptee a votre peau et a vos besoins."}
      </Text>

      {phases.length ? (
        phases.map((phase) => {
          const accent = phaseAccent(phase.name);
          const products = phase.products ?? [];
          const phaseText = htmlToText(phase.htmlText);
          return (
            <View
              key={phase.id}
              style={[styles.phaseCard, { backgroundColor: accent.bg }]}
            >
              <View style={styles.phaseHeader}>
                <View style={styles.phaseTitleRow}>
                  <Text style={[styles.phaseIcon, { color: accent.color }]}>
                    {accent.icon}
                  </Text>
                  <View style={styles.phaseCopy}>
                    <Text style={styles.phaseTitle}>{phase.name}</Text>
                  </View>
                </View>
                <View style={styles.stepsBadge}>
                  <Text style={styles.stepsBadgeText}>
                    {products.length} {products.length > 1 ? "etapes" : "etape"}
                  </Text>
                </View>
              </View>
              {phaseText ? (
                <Text style={styles.phaseHtmlText}>{phaseText}</Text>
              ) : null}

              {products.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.productsRow}
                >
                  {products.map((product, index) => (
                    <ProductStep
                      key={product.uid || product.id || `${phase.id}-${index}`}
                      product={product}
                      index={index}
                      onPress={() => {
                        if (!product.ean) return;
                        router.push({
                          pathname: "/(tabs)/(main)/product/[ean]",
                          params: {
                            ean: product.ean,
                            returnTo: currentReturnPath,
                          },
                        });
                      }}
                    />
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>
                  Aucun produit pour cette phase.
                </Text>
              )}
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aucune phase disponible.</Text>
        </View>
      )}

      {ingredients.length ? (
        <View style={styles.ingredientsSection}>
          <Text style={styles.ingredientsTitle}>
            Meilleurs ingrédients pour cette routine
          </Text>
          <View style={styles.ingredientsRow}>
            {ingredients.map((ingredient, index) => {
              const name = ingredientName(ingredient);
              const officialName = ingredient?.officialName;
              const description = ingredientDescription(ingredient);
              if (!name) return null;

              return (
                <View
                  key={ingredient?.id || `${name}-${index}`}
                  style={styles.ingredientCard}
                >
                  <Text style={styles.ingredientName} numberOfLines={1}>
                    {officialName}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <Pressable onPress={openScanner} style={styles.scanCard}>
        <View style={styles.scanIconWrap}>
          <CameraIcon width={28} height={28} />
        </View>
        <View style={styles.scanCopy}>
          <Text style={styles.scanTitle}>Scanner un produit</Text>
          <Text style={styles.scanText}>
            Verifiez si un produit est adapte a votre routine.
          </Text>
        </View>
        <Text style={styles.scanArrow}>{">"}</Text>
      </Pressable>

      <Modal visible={showScanner} animationType="slide" transparent>
        <View style={styles.scannerRoot}>
          {hasCameraPermission === null ? (
            <View style={styles.permissionCenter}>
              <Text style={styles.permissionText}>
                Demande de permission a la camera...
              </Text>
            </View>
          ) : hasCameraPermission === false ? (
            <View style={styles.permissionCenter}>
              <Text style={styles.permissionDenied}>Permission refusee</Text>
              <TouchableOpacity
                onPress={() => setShowScanner(false)}
                style={styles.closePermissionBtn}
              >
                <Text style={styles.closePermissionText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
                }}
              />

              <View style={styles.scannerOverlay}>
                <View style={styles.scannerHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scannerTitle}>
                      Scanner le code-barres
                    </Text>
                    <Text style={styles.scannerSubtitle}>
                      Pointez votre appareil photo vers un code-barres
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setShowScanner(false)}
                    style={styles.closeScannerBtn}
                  >
                    <Text style={styles.closeScannerText}>x</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.scanAreaWrapper}>
                  <View style={styles.scanBox}>
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />
                    <Animated.View
                      style={[
                        styles.scanLine,
                        {
                          transform: [
                            {
                              translateY: scanLineAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, SCAN_BOX_HEIGHT - 16],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>

      <Modal
        visible={showResult}
        animationType="slide"
        transparent
        onRequestClose={() => setShowResult(false)}
      >
        <View style={styles.resultBackdrop}>
          <View style={styles.resultSheet}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Resultat du scan</Text>
              <Pressable
                onPress={() => setShowResult(false)}
                style={styles.resultCloseBtn}
              >
                <Text style={styles.resultCloseText}>x</Text>
              </Pressable>
            </View>

            {productQuery.isFetching ? (
              <View style={styles.resultLoading}>
                <ActivityIndicator />
                <Text style={styles.stateText}>Analyse du produit...</Text>
              </View>
            ) : (
              <>
                {scannedProduct ? (
                  <View style={styles.resultProductRow}>
                    {scannedProductImage ? (
                      <Image
                        source={{ uri: scannedProductImage }}
                        style={styles.resultProductImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.resultProductImagePlaceholder} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultProductName} numberOfLines={2}>
                        {scannedProduct.name || "Produit scanne"}
                      </Text>
                      <Text style={styles.resultEan}>EAN {scannedEan}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.resultEan}>EAN {scannedEan}</Text>
                )}

                <View
                  style={[
                    styles.resultMessageBox,
                    scanResult.status === "adapted"
                      ? styles.resultPositive
                      : styles.resultNeutral,
                  ]}
                >
                  <Text style={styles.resultMessage}>{scanResult.message}</Text>
                </View>

                {scannedProduct ? (
                  <Pressable
                    onPress={() => {
                      setShowResult(false);
                      router.push({
                        pathname: "/(tabs)/(main)/product/[ean]",
                        params: {
                          ean: scannedEan,
                          returnTo: currentReturnPath,
                        },
                      });
                    }}
                    style={styles.viewProductBtn}
                  >
                    <Text style={styles.viewProductText}>Voir le produit</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4", paddingTop: 22 },
  content: { padding: 16, paddingBottom: 28 },
  centerPage: {
    flex: 1,
    backgroundColor: "#FBF8F4",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconSpacer: { width: 44, height: 44 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    color: "#3F3B37",
  },
  subtitle: {
    color: "rgba(63,59,55,0.64)",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 23,
    marginHorizontal: 28,
    marginBottom: 24,
  },
  phaseCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.06)",
  },
  phaseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  phaseTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  phaseCopy: { flex: 1 },
  phaseIcon: { fontSize: 34, lineHeight: 38, fontWeight: "900" },
  phaseTitle: { fontSize: 19, fontWeight: "900", color: "#3F3B37" },
  phaseHtmlText: {
    marginLeft: 46,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 14,
    paddingLeft: 0,
    paddingRight: 0,
    alignSelf: "stretch",
    color: "rgba(63,59,55,0.62)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "left",
    fontWeight: "600",
  },
  stepsBadge: {
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepsBadgeText: {
    color: "rgba(63,59,55,0.65)",
    fontWeight: "800",
    fontSize: 12,
  },
  htmlBase: {
    color: "rgba(63,59,55,0.62)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
    marginLeft: 0,
    paddingLeft: 0,
  },
  htmlParagraph: {
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 0,
    paddingLeft: 0,
    color: "rgba(63,59,55,0.62)",
  },
  htmlBlock: {
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 0,
    paddingLeft: 0,
    color: "rgba(63,59,55,0.62)",
  },
  htmlList: {
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 0,
    paddingLeft: 16,
    color: "rgba(63,59,55,0.62)",
  },
  htmlListItem: {
    marginTop: 1,
    marginBottom: 1,
    marginLeft: 0,
    paddingLeft: 0,
    color: "rgba(63,59,55,0.62)",
  },
  htmlStrong: { fontWeight: "900", color: "#3F3B37" },
  productsRow: { gap: 14, paddingRight: 2 },
  productCard: { width: 118, alignItems: "center", position: "relative" },
  stepPill: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 2,
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: "rgba(248,218,213,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillText: { color: "#8F5B5E", fontSize: 12, fontWeight: "900" },
  productImage: {
    width: 118,
    height: 118,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.06)",
  },
  productImagePlaceholder: {
    width: 118,
    height: 118,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  productName: {
    color: "#3F3B37",
    fontWeight: "900",
    fontSize: 13,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 10,
  },
  productMeta: {
    color: "rgba(63,59,55,0.56)",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  emptyText: { color: "rgba(63,59,55,0.6)", fontWeight: "700" },
  ingredientsSection: {
    marginTop: 2,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#EEF9F4",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.06)",
  },
  ingredientsTitle: {
    color: "#3F3B37",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  ingredientsRow: {
    // width: 170,
    flexDirection: "row",
        flexWrap: "wrap",

    gap: 10,
    paddingRight: 2,
  },
  ingredientCard: {
    // width: 170,
    // minHeight: 72,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  ingredientName: { color: "#3F3B37", fontWeight: "900", fontSize: 14 },
  ingredientDesc: {
    marginTop: 5,
    color: "rgba(63,59,55,0.62)",
    fontWeight: "600",
    lineHeight: 17,
  },
  scanCard: {
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: "#E8F4EF",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  scanIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  scanCopy: { flex: 1 },
  scanTitle: { color: "#3F3B37", fontSize: 17, fontWeight: "900" },
  scanText: { marginTop: 4, color: "rgba(63,59,55,0.65)", lineHeight: 19 },
  scanArrow: { fontSize: 24, color: "rgba(63,59,55,0.65)", fontWeight: "700" },
  scannerRoot: { flex: 1, backgroundColor: "#000" },
  permissionCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#06153A",
    paddingHorizontal: 24,
  },
  permissionText: { color: "#fff", fontSize: 16, textAlign: "center" },
  permissionDenied: {
    color: "#ff6b6b",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 18,
  },
  closePermissionBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#ffffff22",
  },
  closePermissionText: { color: "#fff", fontWeight: "700" },
  scannerOverlay: {
    flex: 1,
    minHeight: height,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingTop: 56,
    paddingHorizontal: 22,
    justifyContent: "space-between",
    paddingBottom: 42,
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  scannerTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
    marginRight: 12,
  },
  scannerSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 6,
  },
  closeScannerBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeScannerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  scanAreaWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBox: {
    width: SCAN_BOX_WIDTH,
    height: SCAN_BOX_HEIGHT,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 46,
    height: 46,
    borderColor: "#fff",
    zIndex: 2,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 8,
    borderLeftWidth: 8,
    borderTopLeftRadius: 18,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 8,
    borderRightWidth: 8,
    borderTopRightRadius: 18,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderBottomLeftRadius: 18,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 8,
    borderRightWidth: 8,
    borderBottomRightRadius: 18,
  },
  scanLine: {
    position: "absolute",
    left: 14,
    right: 14,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#F7B500",
    shadowColor: "#F7B500",
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  resultBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  resultSheet: {
    backgroundColor: "#FBF8F4",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  resultTitle: { color: "#3F3B37", fontSize: 20, fontWeight: "900" },
  resultCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultCloseText: { color: "#3F3B37", fontWeight: "900", fontSize: 16 },
  resultLoading: { alignItems: "center", paddingVertical: 20 },
  resultProductRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  resultProductImage: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  resultProductImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  resultProductName: { color: "#3F3B37", fontSize: 16, fontWeight: "900" },
  resultEan: { marginTop: 4, color: "rgba(63,59,55,0.58)", fontWeight: "700" },
  resultMessageBox: {
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
  },
  resultPositive: { backgroundColor: "#DFF1EA" },
  resultNeutral: { backgroundColor: "#F8DAD5" },
  resultMessage: {
    color: "#3F3B37",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
  },
  viewProductBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#86C6BA",
    alignItems: "center",
    justifyContent: "center",
  },
  viewProductText: { color: "#fff", fontWeight: "900", fontSize: 16 },
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
