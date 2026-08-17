import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

import {
  Camera,
  CameraView,
} from "expo-camera";

import { Image } from "expo-image";

import {
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";

import ArrowLeftIcon from "../../../../../assets/icons/arrow-left.svg";

import {
  useJourneyById,
  useSubGroupById,
} from "../../../../hooks/useGroups";

import { useProductByEan } from "../../../../hooks/useProduct";

import { recordSuccessfulCameraScan } from "../../../../services/ads/ad-session";

import type { JourneyProduct } from "../../../../types/group";

const { width, height } =
  Dimensions.get("window");

const SCAN_BOX_WIDTH =
  width * 0.78;

const SCAN_BOX_HEIGHT = 220;

type MatchResult = {
  status:
    | "adapted"
    | "not-adapted"
    | "no-product"
    | "not-enough-info";

  message: string;
};

function firstParam(
  value:
    | string
    | string[]
    | undefined
) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function productImage(
  product: JourneyProduct
) {
  return (
    product.images?.[0]?.thumbnail ||
    product.images?.[0]?.image ||
    product.imageUrl ||
    product.image ||
    null
  );
}

function productMeta(
  product: JourneyProduct
) {
  return (
    product.brand?.name ||
    product.type ||
    (product.validScore
      ? `${product.validScore}/20`
      : " ")
  );
}

function debugBack(
  label: string,
  details: Record<
    string,
    unknown
  >
) {
  if (__DEV__) {
    console.debug(
      `[nav:${label}]`,
      details
    );
  }
}

function goBack(
  router:
    ReturnType<
      typeof useRouter
    >,
  returnTo?: string,
  details: Record<
    string,
    unknown
  > = {}
) {
  debugBack(
    "journey-back",
    {
      canGoBack:
        router.canGoBack(),

      returnTo,

      ...details,
    }
  );

  /*
   * Prefer the explicit previous page.
   *
   * With the Tabs navigator router.back()
   * may otherwise return to Home.
   */
  if (returnTo) {
    router.replace(
      returnTo as never
    );

    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(
    "/(tabs)/(main)"
  );
}

function phaseAccent(
  name: string
) {
  const lower =
    name.toLowerCase();

  if (
    lower.includes("soir") ||
    lower.includes("nuit")
  ) {
    return {
      icon: "☾",
      bg: "#FCF1FA",
      color: "#6E4A8B",
    };
  }

  if (
    lower.includes("apres") ||
    lower.includes("après")
  ) {
    return {
      icon: "☀",
      bg: "#EFF9FD",
      color: "#66ADC0",
    };
  }

  return {
    icon: "☀",
    bg: "#FFF7EA",
    color: "#F0B43F",
  };
}

function normalizeText(
  value: unknown
) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function extractIngredients(
  source: any
): any[] {
  const candidates = [
    source?.ingredients,
    source?.ingredientList,
    source?.composition,
    source?.compositions,
    source?.ingredientsList,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function ingredientName(
  item: any
) {
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

function decodeHtmlEntities(
  value: string
) {
  return value
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /&apos;/gi,
      "'"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    );
}

function htmlToText(
  html?: string | null
) {
  if (!html) {
    return "";
  }

  return decodeHtmlEntities(
    html
  )
    .replace(
      /<\s*br\s*\/?>/gi,
      "\n"
    )
    .replace(
      /<\/\s*(p|div|h[1-6])\s*>/gi,
      "\n"
    )
    .replace(
      /<\s*li[^>]*>/gi,
      "\n• "
    )
    .replace(
      /<\/\s*li\s*>/gi,
      ""
    )
    .replace(
      /<\/\s*(ul|ol)\s*>/gi,
      "\n"
    )
    .replace(
      /<[^>]+>/g,
      ""
    )
    .split("\n")
    .map((line) =>
      line.trim()
    )
    .filter(Boolean)
    .join("\n");
}

function compareIngredients(
  product: any,
  referenceJourney: any
): MatchResult {
  if (!product) {
    return {
      status:
        "no-product",

      message:
        "Nous n'avons pas d'information sur ce produit.",
    };
  }

  const productIngredients =
    extractIngredients(
      product
    );

  const journeyIngredients =
    extractIngredients(
      referenceJourney
    );

  if (
    !productIngredients.length
  ) {
    return {
      status:
        "not-enough-info",

      message:
        "Nous n'avons pas assez d'information sur ce produit.",
    };
  }

  if (
    !journeyIngredients.length
  ) {
    return {
      status:
        "not-enough-info",

      message:
        "Aucun ingrédient de référence n'est renseigné pour cette routine.",
    };
  }

  const journeyIds =
    new Set(
      journeyIngredients
        .map(
          (item) =>
            item?.id ??
            item?.ingredientId ??
            item?.uid
        )
        .filter(
          (value) =>
            value !==
              undefined &&
            value !== null
        )
        .map(String)
    );

  const journeyNames =
    new Set(
      journeyIngredients
        .map((item) =>
          normalizeText(
            ingredientName(
              item
            )
          )
        )
        .filter(Boolean)
    );

  const hasMatch =
    productIngredients.some(
      (item) => {
        const ingredientId =
          item?.id ??
          item?.ingredientId ??
          item?.uid;

        if (
          ingredientId !==
            undefined &&
          ingredientId !==
            null &&
          journeyIds.has(
            String(
              ingredientId
            )
          )
        ) {
          return true;
        }

        const name =
          normalizeText(
            ingredientName(
              item
            )
          );

        return (
          !!name &&
          journeyNames.has(
            name
          )
        );
      }
    );

  if (hasMatch) {
    return {
      status: "adapted",

      message:
        "Ce produit est adapté à votre routine.",
    };
  }

  return {
    status: "not-adapted",

    message:
      "Ce produit n'est pas adapté à votre routine.",
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
  const img =
    productImage(product);

  return (
    <Pressable
      style={
        styles.productCard
      }
      onPress={onPress}
    >
      <View
        style={
          styles.stepPill
        }
      >
        <Text
          style={
            styles.stepPillText
          }
        >
          {index + 1}
        </Text>
      </View>

      {img ? (
        <Image
          source={{
            uri: img,
          }}
          style={
            styles.productImage
          }
          contentFit="cover"
        />
      ) : (
        <View
          style={
            styles.productImagePlaceholder
          }
        />
      )}

      <Text
        style={
          styles.productName
        }
        numberOfLines={2}
      >
        {product.name ||
          "Produit"}
      </Text>

      <Text
        style={
          styles.productMeta
        }
        numberOfLines={1}
      >
        {productMeta(
          product
        )}
      </Text>
    </Pressable>
  );
}

export default function JourneyDetailScreen() {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const params =
    useLocalSearchParams<{
      id:
        | string
        | string[];

      returnTo?:
        | string
        | string[];

      selectedJourney?:
        | string
        | string[];
    }>();

  /*
   * The ID in the URL always stays the FIRST journey.
   *
   * Example:
   *
   * /journeys/3
   *
   * Journey 3 is the reference journey for:
   * - ingredients
   * - scanner compatibility
   *
   * Journey 4 can be selected only for displaying
   * its phases/products/title.
   */
  const baseJourneyId =
    firstParam(
      params.id
    ) || "";

  const returnToPath =
    firstParam(
      params.returnTo
    );

  const selectedJourneyParam =
    firstParam(
      params.selectedJourney
    );

  const [
    selectedJourneyId,
    setSelectedJourneyId,
  ] = useState(
    selectedJourneyParam ||
      baseJourneyId
  );

  /*
   * Load the first/base journey permanently.
   */
  const baseJourneyQuery =
    useJourneyById(
      baseJourneyId
    );

  const baseJourney =
    baseJourneyQuery.data;

  /*
   * Load the currently selected journey.
   *
   * Initially it is the same journey as baseJourneyId.
   */
  const selectedJourneyQuery =
    useJourneyById(
      selectedJourneyId
    );

  const selectedJourney =
    selectedJourneyQuery.data;

  /*
   * Use the selected journey for screen content.
   *
   * During initial loading, fall back to the base journey.
   */
  const journey =
    selectedJourney ||
    (selectedJourneyId ===
    baseJourneyId
      ? baseJourney
      : undefined);

  /*
   * Determine subgroup from the FIRST journey.
   */
  const subgroupId =
    baseJourney?.subgroup
      ?.id;

  /*
   * Load subgroup so we know all available journeys.
   */
  const subgroupQuery =
    useSubGroupById(
      subgroupId
        ? String(
            subgroupId
          )
        : ""
    );

  /*
   * Sort journeys exactly as subgroup/[id].tsx does.
   *
   * Journey with smallest ID remains first.
   */
  const availableJourneys =
    useMemo(() => {
      return [
        ...(
          subgroupQuery.data
            ?.journeys ?? []
        ),
      ].sort(
        (
          first,
          second
        ) =>
          Number(
            first.id
          ) -
          Number(
            second.id
          )
      );
    }, [
      subgroupQuery.data
        ?.journeys,
    ]);

  /*
   * If we returned from another screen while Journey 4
   * was selected, restore that selection.
   */
  useEffect(() => {
    if (
      selectedJourneyParam &&
      selectedJourneyParam !==
        selectedJourneyId
    ) {
      setSelectedJourneyId(
        selectedJourneyParam
      );
    }
  }, [
    selectedJourneyParam,
    selectedJourneyId,
  ]);

  /*
   * If a stale selectedJourney param points to a journey
   * that no longer exists, safely return to base journey.
   */
  useEffect(() => {
    if (
      !availableJourneys.length ||
      !selectedJourneyId
    ) {
      return;
    }

    const exists =
      availableJourneys.some(
        (item) =>
          String(
            item.id
          ) ===
          String(
            selectedJourneyId
          )
      );

    if (!exists) {
      setSelectedJourneyId(
        baseJourneyId
      );

      router.setParams({
        selectedJourney:
          undefined,
      });
    }
  }, [
    availableJourneys,
    selectedJourneyId,
    baseJourneyId,
    router,
  ]);

  /*
   * Switch journey without navigating to another page.
   */
  const selectJourney = (
    journeyId:
      | string
      | number
  ) => {
    const nextId =
      String(journeyId);

    if (
      nextId ===
      selectedJourneyId
    ) {
      return;
    }

    setSelectedJourneyId(
      nextId
    );

    if (
      nextId ===
      baseJourneyId
    ) {
      router.setParams({
        selectedJourney:
          undefined,
      });

      return;
    }

    router.setParams({
      selectedJourney:
        nextId,
    });
  };

  /*
   * This is used when opening a product from the journey.
   *
   * It preserves the currently selected journey.
   *
   * Example:
   *
   * Journey 4
   * → Product
   * → Back
   * → Journey 4 still selected.
   */
  const currentReturnPath =
    useMemo(() => {
      const queryParts:
        string[] = [];

      if (returnToPath) {
        queryParts.push(
          `returnTo=${encodeURIComponent(
            returnToPath
          )}`
        );
      }

      if (
        selectedJourneyId &&
        selectedJourneyId !==
          baseJourneyId
      ) {
        queryParts.push(
          `selectedJourney=${encodeURIComponent(
            selectedJourneyId
          )}`
        );
      }

      const query =
        queryParts.length
          ? `?${queryParts.join(
              "&"
            )}`
          : "";

      return `/(tabs)/(main)/journeys/${baseJourneyId}${query}`;
    }, [
      baseJourneyId,
      returnToPath,
      selectedJourneyId,
    ]);

  /*
   * Scanner state
   */
  const [
    showScanner,
    setShowScanner,
  ] = useState(false);

  const [
    hasCameraPermission,
    setHasCameraPermission,
  ] = useState<
    boolean | null
  >(null);

  const [
    scanned,
    setScanned,
  ] = useState(false);

  const [
    scannedEan,
    setScannedEan,
  ] = useState("");

  const [
    showResult,
    setShowResult,
  ] = useState(false);

  const scanLineAnim =
    useRef(
      new Animated.Value(0)
    ).current;

  const countedScanRef =
    useRef(false);

  const scanEventIdRef =
    useRef<string | null>(null);

  const productQuery =
    useProductByEan(
      scannedEan,
      {
        enabled:
          !!scannedEan,
      }
    );

  const scannedProduct =
    productQuery.data as any;

  const scannedProductImage =
    scannedProduct
      ?.images?.[0]
      ?.thumbnail ||
    scannedProduct
      ?.images?.[0]
      ?.image ||
    scannedProduct?.image ||
    null;

  /*
   * PHASES:
   *
   * These come from the selected journey.
   *
   * Journey 3 selected → Journey 3 phases.
   * Journey 4 selected → Journey 4 phases.
   */
  const phases =
    useMemo(() => {
      return [
        ...(
          journey?.phases ??
          []
        ),
      ].sort(
        (a, b) =>
          Number(
            a.sortOrder ?? 0
          ) -
          Number(
            b.sortOrder ?? 0
          )
      );
    }, [
      journey?.phases,
    ]);

  /*
   * INGREDIENTS:
   *
   * IMPORTANT:
   * They ALWAYS come from the FIRST journey.
   *
   * Journey 4 can have ingredients: []
   * and EUGENOL from Journey 3 will still be displayed.
   */
  const ingredients =
    useMemo(
      () =>
        extractIngredients(
          baseJourney
        ),
      [baseJourney]
    );

  /*
   * Scanner also ALWAYS compares against
   * ingredients from the FIRST journey.
   */
  const scanResult =
    useMemo(
      () =>
        compareIngredients(
          scannedProduct,
          baseJourney
        ),
      [
        scannedProduct,
        baseJourney,
      ]
    );

  useEffect(() => {
    if (!showScanner) {
      return;
    }

    setScanned(false);

    if (
      hasCameraPermission ===
      null
    ) {
      void (async () => {
        const { status } =
          await Camera.requestCameraPermissionsAsync();

        setHasCameraPermission(
          status === "granted"
        );
      })();
    }
  }, [
    showScanner,
    hasCameraPermission,
  ]);

  useEffect(() => {
    if (!showScanner) {
      return;
    }

    scanLineAnim.setValue(
      0
    );

    const loop =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            scanLineAnim,
            {
              toValue: 1,
              duration: 1800,

              easing:
                Easing.inOut(
                  Easing.ease
                ),

              useNativeDriver:
                true,
            }
          ),

          Animated.timing(
            scanLineAnim,
            {
              toValue: 0,
              duration: 1800,

              easing:
                Easing.inOut(
                  Easing.ease
                ),

              useNativeDriver:
                true,
            }
          ),
        ])
      );

    loop.start();

    return () =>
      loop.stop();
  }, [
    showScanner,
    scanLineAnim,
  ]);

  useEffect(() => {
    if (
      !scannedEan ||
      productQuery.isFetching
    ) {
      return;
    }

    if (
      scannedProduct &&
      productQuery.isSuccess
    ) {
      setShowResult(true);

      if (
        !countedScanRef.current
      ) {
        countedScanRef.current =
          true;

        const scanEventId =
          scanEventIdRef.current;

        if (scanEventId) {
          void recordSuccessfulCameraScan(
            scanEventId
          ).catch((scanError) => {
            if (__DEV__) {
              console.warn(
                "[Ads] journey camera scan could not be processed",
                scanError
              );
            }
          });
        }
      }

      return;
    }

    if (
      productQuery.isError
    ) {
      setShowResult(true);
    }
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
    scanEventIdRef.current =
      null;
    setShowScanner(true);
  };

  const handleBarCodeScanned =
    ({
      data,
    }: {
      data: string;
    }) => {
      if (scanned) {
        return;
      }

      setScanned(true);
      setShowScanner(false);

      const code =
        String(
          data || ""
        ).trim();

      if (!code) {
        return;
      }

      countedScanRef.current =
        false;

      scanEventIdRef.current =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

      setScannedEan(
        code
      );
    };

  /*
   * Initial screen loading.
   */
  const initialLoading =
    baseJourneyQuery.isLoading ||
    (!journey &&
      selectedJourneyQuery.isLoading);

  if (initialLoading) {
    return (
      <View
        style={
          styles.centerPage
        }
      >
        <ActivityIndicator
          size="large"
          color="#86C6BA"
        />

        <Text
          style={
            styles.stateText
          }
        >
          Chargement de votre
          routine...
        </Text>
      </View>
    );
  }

  /*
   * Base journey is critical.
   *
   * If it cannot load, the entire routine cannot work.
   */
  if (
    baseJourneyQuery.isError ||
    !baseJourney
  ) {
    return (
      <View
        style={
          styles.centerPage
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Impossible de charger
          la routine.
        </Text>

        <Pressable
          onPress={() =>
            baseJourneyQuery.refetch()
          }
          style={
            styles.retryBtn
          }
        >
          <Text
            style={
              styles.retryText
            }
          >
            Réessayer
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            goBack(
              router,
              returnToPath,
              {
                pathname,

                params: {
                  id:
                    baseJourneyId,

                  returnTo:
                    params.returnTo,
                },

                source:
                  "error-state",
              }
            )
          }
          style={
            styles.backTextBtn
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            Retour
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      {/* Header */}
      <View
        style={
          styles.header
        }
      >
        <Pressable
          onPress={() =>
            goBack(
              router,
              returnToPath,
              {
                pathname,

                params: {
                  id:
                    baseJourneyId,

                  returnTo:
                    params.returnTo,

                  selectedJourney:
                    selectedJourneyId,
                },

                source:
                  "header",
              }
            )
          }
          style={({ pressed }) => [
            styles.iconBtn,

            pressed &&
              styles.iconBtnPressed,
          ]}
        >
          <ArrowLeftIcon
            width={22}
            height={22}
          />
        </Pressable>

        <Text
          style={
            styles.headerTitle
          }
          numberOfLines={1}
        >
          {journey?.title ||
            baseJourney.title ||
            "Ma routine"}
        </Text>

        <View
          style={
            styles.iconSpacer
          }
        />
      </View>

      {/* Selected journey description */}
      <Text
        style={
          styles.subtitle
        }
      >
        {journey?.description ||
          baseJourney.description ||
          "Découvrez votre routine idéale, adaptée à votre peau et à vos besoins."}
      </Text>

      {/* Journey selector */}
      {availableJourneys.length >
      1 ? (
        <View
          style={
            styles.switcherSection
          }
        >
          {/* <Text
            style={
              styles.switcherLabel
            }
          >
            Choisissez votre
            routine
          </Text> */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.journeySwitcher
            }
          >
            {availableJourneys.map(
              (
                item,
                index
              ) => {
                const itemId =
                  String(
                    item.id
                  );

                const active =
                  itemId ===
                  selectedJourneyId;

                return (
                  <Pressable
                    key={
                      item.id
                    }
                    onPress={() =>
                      selectJourney(
                        item.id
                      )
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.journeyOption,

                      active &&
                        styles.journeyOptionActive,

                      pressed &&
                        styles.journeyOptionPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.journeyNumber,

                        active &&
                          styles.journeyNumberActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.journeyNumberText,

                          active &&
                            styles.journeyNumberTextActive,
                        ]}
                      >
                        {index +
                          1}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={
                        1
                      }
                      style={[
                        styles.journeyOptionText,

                        active &&
                          styles.journeyOptionTextActive,
                      ]}
                    >
                      {item.title ||
                        item.name ||
                        `Routine ${
                          index +
                          1
                        }`}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </ScrollView>
        </View>
      ) : null}

      {/* Loading while switching journey */}
      {selectedJourneyQuery.isFetching &&
      selectedJourneyId !==
        baseJourneyId ? (
        <View
          style={
            styles.switchLoading
          }
        >
          <ActivityIndicator
            size="small"
            color="#86C6BA"
          />

          <Text
            style={
              styles.switchLoadingText
            }
          >
            Chargement de la
            routine...
          </Text>
        </View>
      ) : null}

      {/* Selected journey error */}
      {selectedJourneyQuery.isError &&
      selectedJourneyId !==
        baseJourneyId ? (
        <View
          style={
            styles.switchErrorCard
          }
        >
          <Text
            style={
              styles.switchErrorText
            }
          >
            Impossible de charger
            cette routine.
          </Text>

          <Pressable
            onPress={() =>
              selectedJourneyQuery.refetch()
            }
            style={
              styles.switchRetryBtn
            }
          >
            <Text
              style={
                styles.switchRetryText
              }
            >
              Réessayer
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Phases from selected journey */}
      {!selectedJourneyQuery.isError &&
      phases.length ? (
        phases.map(
          (phase) => {
            const accent =
              phaseAccent(
                phase.name
              );

            const products =
              phase.products ??
              [];

            const phaseText =
              htmlToText(
                phase.htmlText
              );

            return (
              <View
                key={
                  phase.id
                }
                style={[
                  styles.phaseCard,

                  {
                    backgroundColor:
                      accent.bg,
                  },
                ]}
              >
                <View
                  style={
                    styles.phaseHeader
                  }
                >
                  <View
                    style={
                      styles.phaseTitleRow
                    }
                  >
                    <Text
                      style={[
                        styles.phaseIcon,

                        {
                          color:
                            accent.color,
                        },
                      ]}
                    >
                      {
                        accent.icon
                      }
                    </Text>

                    <View
                      style={
                        styles.phaseCopy
                      }
                    >
                      <Text
                        style={
                          styles.phaseTitle
                        }
                      >
                        {
                          phase.name
                        }
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.stepsBadge
                    }
                  >
                    <Text
                      style={
                        styles.stepsBadgeText
                      }
                    >
                      {
                        products.length
                      }{" "}
                      {products.length >
                      1
                        ? "étapes"
                        : "étape"}
                    </Text>
                  </View>
                </View>

                {phaseText ? (
                  <Text
                    style={
                      styles.phaseHtmlText
                    }
                  >
                    {
                      phaseText
                    }
                  </Text>
                ) : null}

                {products.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    contentContainerStyle={
                      styles.productsRow
                    }
                  >
                    {products.map(
                      (
                        product,
                        index
                      ) => (
                        <ProductStep
                          key={
                            product.uid ||
                            product.id ||
                            `${phase.id}-${index}`
                          }
                          product={
                            product
                          }
                          index={
                            index
                          }
                          onPress={() => {
                            if (
                              !product.ean
                            ) {
                              return;
                            }

                            router.push(
                              {
                                pathname:
                                  "/(tabs)/(main)/product/[ean]",

                                params:
                                  {
                                    ean:
                                      product.ean,

                                    returnTo:
                                      currentReturnPath,
                                  },
                              }
                            );
                          }}
                        />
                      )
                    )}
                  </ScrollView>
                ) : (
                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Aucun produit
                    pour cette
                    phase.
                  </Text>
                )}
              </View>
            );
          }
        )
      ) : !selectedJourneyQuery.isFetching &&
        !selectedJourneyQuery.isError ? (
        <View
          style={
            styles.emptyCard
          }
        >
          <Text
            style={
              styles.emptyText
            }
          >
            Aucune phase
            disponible.
          </Text>
        </View>
      ) : null}

      {/*
       * Ingredients ALWAYS come from first journey.
       */}
      {ingredients.length ? (
        <View
          style={
            styles.ingredientsSection
          }
        >
          <Text
            style={
              styles.ingredientsTitle
            }
          >
            Principe actif adapté à
            cette routine.
          </Text>

          <View
            style={
              styles.ingredientsRow
            }
          >
            {ingredients.map(
              (
                ingredient,
                index
              ) => {
                const name =
                  ingredientName(
                    ingredient
                  );

                const officialName =
                  ingredient
                    ?.officialName ||
                  name;

                if (!name) {
                  return null;
                }

                return (
                  <View
                    key={
                      ingredient?.id ||
                      `${name}-${index}`
                    }
                    style={
                      styles.ingredientCard
                    }
                  >
                    <Text
                      style={
                        styles.ingredientName
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {
                        officialName
                      }
                    </Text>
                  </View>
                );
              }
            )}
          </View>
        </View>
      ) : null}

      {/*
       * Scanner only exists when first/reference
       * journey has ingredients.
       */}
      {ingredients.length ? (
        <Pressable
          onPress={
            openScanner
          }
          style={
            styles.scanCard
          }
        >
          <View
            style={
              styles.scanCopy
            }
          >
            <Text
              style={
                styles.scanTitle
              }
            >
              Scanner un produit
            </Text>

            <Text
              style={
                styles.scanText
              }
            >
              Vérifiez si un
              produit est adapté
              à votre routine.
            </Text>
          </View>

          <Text
            style={
              styles.scanArrow
            }
          >
            {">"}
          </Text>
        </Pressable>
      ) : null}

      {/* Scanner modal */}
      <Modal
        visible={
          showScanner
        }
        animationType="slide"
        transparent
      >
        <View
          style={
            styles.scannerRoot
          }
        >
          {hasCameraPermission ===
          null ? (
            <View
              style={
                styles.permissionCenter
              }
            >
              <Text
                style={
                  styles.permissionText
                }
              >
                Demande de
                permission à la
                caméra...
              </Text>
            </View>
          ) : hasCameraPermission ===
            false ? (
            <View
              style={
                styles.permissionCenter
              }
            >
              <Text
                style={
                  styles.permissionDenied
                }
              >
                Permission refusée
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowScanner(
                    false
                  )
                }
                style={
                  styles.closePermissionBtn
                }
              >
                <Text
                  style={
                    styles.closePermissionText
                  }
                >
                  Fermer
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={
                  StyleSheet.absoluteFillObject
                }
                facing="back"
                onBarcodeScanned={
                  scanned
                    ? undefined
                    : handleBarCodeScanned
                }
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "ean13",
                    "ean8",
                    "upc_a",
                    "upc_e",
                  ],
                }}
              />

              <View
                style={
                  styles.scannerOverlay
                }
              >
                <View
                  style={
                    styles.scannerHeader
                  }
                >
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.scannerTitle
                      }
                    >
                      Scanner le
                      code-barres
                    </Text>

                    <Text
                      style={
                        styles.scannerSubtitle
                      }
                    >
                      Pointez votre
                      appareil photo
                      vers un
                      code-barres
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      setShowScanner(
                        false
                      )
                    }
                    style={
                      styles.closeScannerBtn
                    }
                  >
                    <Text
                      style={
                        styles.closeScannerText
                      }
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.scanAreaWrapper
                  }
                >
                  <View
                    style={
                      styles.scanBox
                    }
                  >
                    <View
                      style={[
                        styles.corner,
                        styles.cornerTopLeft,
                      ]}
                    />

                    <View
                      style={[
                        styles.corner,
                        styles.cornerTopRight,
                      ]}
                    />

                    <View
                      style={[
                        styles.corner,
                        styles.cornerBottomLeft,
                      ]}
                    />

                    <View
                      style={[
                        styles.corner,
                        styles.cornerBottomRight,
                      ]}
                    />

                    <Animated.View
                      style={[
                        styles.scanLine,

                        {
                          transform:
                            [
                              {
                                translateY:
                                  scanLineAnim.interpolate(
                                    {
                                      inputRange:
                                        [
                                          0,
                                          1,
                                        ],

                                      outputRange:
                                        [
                                          10,
                                          SCAN_BOX_HEIGHT -
                                            16,
                                        ],
                                    }
                                  ),
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

      {/* Scan result */}
      <Modal
        visible={
          showResult
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setShowResult(false)
        }
      >
        <View
          style={
            styles.resultBackdrop
          }
        >
          <View
            style={
              styles.resultSheet
            }
          >
            <View
              style={
                styles.resultHeader
              }
            >
              <Text
                style={
                  styles.resultTitle
                }
              >
                Résultat du scan
              </Text>

              <Pressable
                onPress={() =>
                  setShowResult(
                    false
                  )
                }
                style={
                  styles.resultCloseBtn
                }
              >
                <Text
                  style={
                    styles.resultCloseText
                  }
                >
                  ×
                </Text>
              </Pressable>
            </View>

            {productQuery.isFetching ? (
              <View
                style={
                  styles.resultLoading
                }
              >
                <ActivityIndicator />

                <Text
                  style={
                    styles.stateText
                  }
                >
                  Analyse du
                  produit...
                </Text>
              </View>
            ) : (
              <>
                {scannedProduct ? (
                  <View
                    style={
                      styles.resultProductRow
                    }
                  >
                    {scannedProductImage ? (
                      <Image
                        source={{
                          uri:
                            scannedProductImage,
                        }}
                        style={
                          styles.resultProductImage
                        }
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={
                          styles.resultProductImagePlaceholder
                        }
                      />
                    )}

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.resultProductName
                        }
                        numberOfLines={
                          2
                        }
                      >
                        {scannedProduct.name ||
                          "Produit scanné"}
                      </Text>

                      <Text
                        style={
                          styles.resultEan
                        }
                      >
                        EAN{" "}
                        {
                          scannedEan
                        }
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text
                    style={
                      styles.resultEan
                    }
                  >
                    EAN{" "}
                    {scannedEan}
                  </Text>
                )}

                <View
                  style={[
                    styles.resultMessageBox,

                    scanResult.status ===
                    "adapted"
                      ? styles.resultPositive
                      : styles.resultNeutral,
                  ]}
                >
                  <Text
                    style={
                      styles.resultMessage
                    }
                  >
                    {
                      scanResult.message
                    }
                  </Text>
                </View>

                {scannedProduct ? (
                  <Pressable
                    onPress={() => {
                      setShowResult(
                        false
                      );

                      router.push(
                        {
                          pathname:
                            "/(tabs)/(main)/product/[ean]",

                          params:
                            {
                              ean:
                                scannedEan,

                              returnTo:
                                currentReturnPath,
                            },
                        }
                      );
                    }}
                    style={
                      styles.viewProductBtn
                    }
                  >
                    <Text
                      style={
                        styles.viewProductText
                      }
                    >
                      Voir le
                      produit
                    </Text>
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

const styles =
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor:
        "#FBF8F4",
      paddingTop: 22,
    },

    content: {
      padding: 16,
      paddingBottom: 28,
    },

    centerPage: {
      flex: 1,
      backgroundColor:
        "#FBF8F4",
      alignItems: "center",
      justifyContent:
        "center",
      padding: 24,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingVertical: 8,
    },

    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 999,

      backgroundColor:
        "rgba(0,0,0,0.04)",

      alignItems: "center",
      justifyContent:
        "center",
    },

    iconBtnPressed: {
      opacity: 0.7,
    },

    iconSpacer: {
      width: 44,
      height: 44,
    },

    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "900",
      color: "#3F3B37",
    },

    subtitle: {
      color:
        "rgba(63,59,55,0.64)",

      textAlign: "center",

      fontSize: 16,
      lineHeight: 23,

      marginHorizontal: 28,
      marginBottom: 18,
    },

    /*
     * Journey selector
     */
    switcherSection: {
      marginBottom: 16,
    },

    switcherLabel: {
      color:
        "rgba(63,59,55,0.55)",

      fontSize: 12,
      fontWeight: "800",

      marginBottom: 8,
      paddingHorizontal: 2,
    },

    journeySwitcher: {
      gap: 10,
      paddingHorizontal: 2,
      paddingRight: 16,
    },

    journeyOption: {
      minWidth: 150,
      maxWidth: 220,
      height: 50,

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 10,

      borderRadius: 16,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.08)",
    },

    journeyOptionActive: {
      backgroundColor:
        "#3F3B37",

      borderColor:
        "#3F3B37",
    },

    journeyOptionPressed: {
      opacity: 0.78,
    },

    journeyNumber: {
      width: 30,
      height: 30,

      borderRadius: 9,

      backgroundColor:
        "#F1EEEA",

      alignItems: "center",
      justifyContent:
        "center",

      marginRight: 9,
    },

    journeyNumberActive: {
      backgroundColor:
        "rgba(255,255,255,0.17)",
    },

    journeyNumberText: {
      color: "#625D58",

      fontSize: 13,
      fontWeight: "900",
    },

    journeyNumberTextActive: {
      color: "#FFFFFF",
    },

    journeyOptionText: {
      flex: 1,

      color: "#3F3B37",

      fontSize: 13,
      fontWeight: "800",
    },

    journeyOptionTextActive: {
      color: "#FFFFFF",
    },

    switchLoading: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",

      gap: 8,

      marginBottom: 14,

      paddingVertical: 12,

      borderRadius: 14,

      backgroundColor:
        "rgba(134,198,186,0.08)",
    },

    switchLoadingText: {
      color:
        "rgba(63,59,55,0.58)",

      fontSize: 12,
      fontWeight: "700",
    },

    switchErrorCard: {
      marginBottom: 16,

      borderRadius: 16,

      padding: 14,

      backgroundColor:
        "#FCECEA",

      alignItems: "center",
    },

    switchErrorText: {
      color: "#B42318",

      fontSize: 13,
      fontWeight: "700",

      textAlign: "center",
    },

    switchRetryBtn: {
      marginTop: 10,

      paddingHorizontal: 16,
      paddingVertical: 8,

      borderRadius: 12,

      backgroundColor:
        "#C97E82",
    },

    switchRetryText: {
      color: "#FFFFFF",
      fontWeight: "900",
    },

    /*
     * Phase
     */
    phaseCard: {
      borderRadius: 20,

      padding: 16,

      marginBottom: 16,

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.06)",
    },

    phaseHeader: {
      flexDirection: "row",

      justifyContent:
        "space-between",

      gap: 12,

      marginBottom: 6,
    },

    phaseTitleRow: {
      flex: 1,

      flexDirection: "row",

      alignItems:
        "flex-start",

      gap: 12,
    },

    phaseCopy: {
      flex: 1,
    },

    phaseIcon: {
      fontSize: 34,
      lineHeight: 38,
      fontWeight: "900",
    },

    phaseTitle: {
      fontSize: 19,
      fontWeight: "900",

      color: "#3F3B37",
    },

    phaseHtmlText: {
      marginLeft: 46,

      marginTop: 0,
      marginBottom: 14,

      alignSelf: "stretch",

      color:
        "rgba(63,59,55,0.62)",

      fontSize: 14,
      lineHeight: 20,

      textAlign: "left",

      fontWeight: "600",
    },

    stepsBadge: {
      height: 34,

      borderRadius: 10,

      paddingHorizontal: 12,

      backgroundColor:
        "rgba(255,255,255,0.55)",

      alignItems: "center",
      justifyContent:
        "center",
    },

    stepsBadgeText: {
      color:
        "rgba(63,59,55,0.65)",

      fontWeight: "800",

      fontSize: 12,
    },

    productsRow: {
      gap: 14,
      paddingRight: 2,
    },

    productCard: {
      width: 118,

      alignItems: "center",

      position: "relative",
    },

    stepPill: {
      position: "absolute",

      top: 8,
      left: 8,

      zIndex: 2,

      width: 22,
      height: 22,

      borderRadius: 7,

      backgroundColor:
        "rgba(248,218,213,0.85)",

      alignItems: "center",
      justifyContent:
        "center",
    },

    stepPillText: {
      color: "#8F5B5E",

      fontSize: 12,
      fontWeight: "900",
    },

    productImage: {
      width: 118,
      height: 118,

      borderRadius: 12,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.06)",
    },

    productImagePlaceholder:
      {
        width: 118,
        height: 118,

        borderRadius: 12,

        backgroundColor:
          "rgba(255,255,255,0.7)",
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
      color:
        "rgba(63,59,55,0.56)",

      fontWeight: "600",

      fontSize: 12,

      marginTop: 4,

      textAlign: "center",
    },

    emptyCard: {
      backgroundColor:
        "rgba(255,255,255,0.75)",

      borderRadius: 18,

      padding: 18,

      marginBottom: 16,
    },

    emptyText: {
      color:
        "rgba(63,59,55,0.6)",

      fontWeight: "700",
    },

    /*
     * Ingredients
     */
    ingredientsSection: {
      marginTop: 2,
      marginBottom: 16,

      borderRadius: 20,

      padding: 16,

      backgroundColor:
        "#EEF9F4",

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.06)",
    },

    ingredientsTitle: {
      color: "#3F3B37",

      fontSize: 18,
      fontWeight: "900",

      marginBottom: 12,
    },

    ingredientsRow: {
      flexDirection: "row",
      flexWrap: "wrap",

      gap: 10,

      paddingRight: 2,
    },

    ingredientCard: {
      borderRadius: 16,

      padding: 12,

      backgroundColor:
        "rgba(255,255,255,0.78)",
    },

    ingredientName: {
      color: "#3F3B37",

      fontWeight: "900",

      fontSize: 14,
    },

    /*
     * Scanner card
     */
    scanCard: {
      marginTop: 8,

      borderRadius: 20,

      backgroundColor:
        "#E8F4EF",

      padding: 16,

      flexDirection: "row",
      alignItems: "center",

      shadowColor: "#000",

      shadowOpacity: 0.06,

      shadowRadius: 10,

      shadowOffset: {
        width: 0,
        height: 6,
      },

      elevation: 2,
    },

    scanCopy: {
      flex: 1,
    },

    scanTitle: {
      color: "#3F3B37",

      fontSize: 17,
      fontWeight: "900",
    },

    scanText: {
      marginTop: 4,

      color:
        "rgba(63,59,55,0.65)",

      lineHeight: 19,
    },

    scanArrow: {
      fontSize: 24,

      color:
        "rgba(63,59,55,0.65)",

      fontWeight: "700",
    },

    /*
     * Camera
     */
    scannerRoot: {
      flex: 1,
      backgroundColor:
        "#000",
    },

    permissionCenter: {
      flex: 1,

      justifyContent:
        "center",

      alignItems: "center",

      backgroundColor:
        "#06153A",

      paddingHorizontal: 24,
    },

    permissionText: {
      color: "#fff",

      fontSize: 16,

      textAlign: "center",
    },

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

      backgroundColor:
        "#ffffff22",
    },

    closePermissionText: {
      color: "#fff",

      fontWeight: "700",
    },

    scannerOverlay: {
      flex: 1,

      minHeight: height,

      backgroundColor:
        "rgba(0,0,0,0.45)",

      paddingTop: 56,
      paddingHorizontal: 22,
      paddingBottom: 42,

      justifyContent:
        "space-between",
    },

    scannerHeader: {
      flexDirection: "row",

      alignItems:
        "flex-start",
    },

    scannerTitle: {
      color: "#fff",

      fontSize: 30,
      fontWeight: "800",

      lineHeight: 38,

      marginRight: 12,
    },

    scannerSubtitle: {
      color:
        "rgba(255,255,255,0.85)",

      fontSize: 16,

      lineHeight: 24,

      marginTop: 6,
    },

    closeScannerBtn: {
      width: 44,
      height: 44,

      borderRadius: 999,

      backgroundColor:
        "rgba(255,255,255,0.18)",

      alignItems: "center",
      justifyContent:
        "center",
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
      justifyContent:
        "center",
    },

    scanBox: {
      width:
        SCAN_BOX_WIDTH,

      height:
        SCAN_BOX_HEIGHT,

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

      backgroundColor:
        "#F7B500",

      shadowColor:
        "#F7B500",

      shadowOpacity: 0.9,

      shadowRadius: 4,

      shadowOffset: {
        width: 0,
        height: 0,
      },

      elevation: 4,
    },

    /*
     * Result
     */
    resultBackdrop: {
      flex: 1,

      backgroundColor:
        "rgba(0,0,0,0.35)",

      justifyContent:
        "flex-end",
    },

    resultSheet: {
      backgroundColor:
        "#FBF8F4",

      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,

      padding: 18,

      paddingBottom: 28,
    },

    resultHeader: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginBottom: 14,
    },

    resultTitle: {
      color: "#3F3B37",

      fontSize: 20,
      fontWeight: "900",
    },

    resultCloseBtn: {
      width: 36,
      height: 36,

      borderRadius: 999,

      backgroundColor:
        "rgba(0,0,0,0.06)",

      alignItems: "center",
      justifyContent:
        "center",
    },

    resultCloseText: {
      color: "#3F3B37",

      fontWeight: "900",

      fontSize: 16,
    },

    resultLoading: {
      alignItems: "center",

      paddingVertical: 20,
    },

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

      backgroundColor:
        "rgba(0,0,0,0.06)",
    },

    resultProductImagePlaceholder:
      {
        width: 70,
        height: 70,

        borderRadius: 14,

        backgroundColor:
          "rgba(0,0,0,0.06)",
      },

    resultProductName: {
      color: "#3F3B37",

      fontSize: 16,
      fontWeight: "900",
    },

    resultEan: {
      marginTop: 4,

      color:
        "rgba(63,59,55,0.58)",

      fontWeight: "700",
    },

    resultMessageBox: {
      borderRadius: 16,

      padding: 14,

      marginTop: 6,
    },

    resultPositive: {
      backgroundColor:
        "#DFF1EA",
    },

    resultNeutral: {
      backgroundColor:
        "#F8DAD5",
    },

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

      backgroundColor:
        "#86C6BA",

      alignItems: "center",
      justifyContent:
        "center",
    },

    viewProductText: {
      color: "#fff",

      fontWeight: "900",

      fontSize: 16,
    },

    stateText: {
      marginTop: 10,

      color:
        "rgba(63,59,55,0.65)",

      fontWeight: "700",
    },

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

      backgroundColor:
        "#86C6BA",

      alignItems: "center",
      justifyContent:
        "center",
    },

    retryText: {
      color: "#fff",

      fontWeight: "900",
    },

    backTextBtn: {
      marginTop: 12,
      padding: 10,
    },

    backText: {
      color:
        "rgba(63,59,55,0.7)",

      fontWeight: "800",
    },
  });
