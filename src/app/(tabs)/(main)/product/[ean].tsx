import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useProductByEan } from "../../../../hooks/useProduct";
import type { Product } from "../../../../types/product";

import HeartIcon from "../../../../../assets/icons/heart.svg";
import HeartRedIcon from "../../../../../assets/icons/heart-red.svg";
import ArrowLeftIcon from "../../../../../assets/icons/arrow-left.svg";

import { useAuth } from "../../../../components/AuthProvider";
import { useFavorites } from "../../../../hooks/useFavorites";

import ProductDetailLoader from "../../../../components/ProductDetailLoader";

import NoProduct from "../../../../../assets/noProduct.svg";


import {
  maybeShowTimeInterstitial,
  recordSuccessfulCameraScan,
} from "../../../../services/ads/ad-session";

import StarRating from "../../../../components/StarRating";

import { useProductFeedback } from "../../../../hooks/useProductFeedback";
import { useRecordScan } from "../../../../hooks/useScans";

const INITIAL_INGREDIENT_LIMIT = 15;

function formatRating(
  value: number
) {
  return value
    .toFixed(1)
    .replace(".", ",");
}

function clampRating(
  value: unknown
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(5, number)
  );
}

function getSatisfactionText(
  rating: number
) {
  if (rating >= 4.5) {
    return "Très satisfaits";
  }

  if (rating >= 4) {
    return "Satisfaits";
  }

  if (rating >= 3) {
    return "Plutôt satisfaits";
  }

  if (rating >= 2) {
    return "Avis mitigés";
  }

  if (rating > 0) {
    return "Peu satisfaits";
  }

  return "Aucun avis";
}

function getBeautyScoreColor(score100: number) {
  if (score100 < 20) return "#E53935";   // 0-19
  if (score100 < 40) return "#F06432";   // 20-39
  if (score100 < 60) return "#F5B522";   // 40-59
  if (score100 < 80) return "#A7CC39";   // 60-79
  return "#35A853";                      // 80-100
}

function BeautyScoreBar({
  score,
}: {
  score: number;
}) {
  /*
   * Your current API data is normally /20.
   * Convert it to /100 for this visual.
   *
   * This also protects the UI if the backend
   * later starts returning scores directly /100.
   */
  const score100 =
    score <= 20
      ? score * 5
      : score;

  const normalizedScore =
    Math.max(
      0,
      Math.min(100, score100)
    );

  const color =
    getBeautyScoreColor(
      normalizedScore
    );

  const segments =
    Array.from({
      length: 5,
    });

  return (
    <View style={styles.beautyProgressContainer}>
      <View style={styles.beautyProgressTop}>
        <Text style={styles.beautyProgressTitle}>
          Score Composition
        </Text>

        {/* <Text
          style={[
            styles.beautyProgressValue,
            { color },
          ]}
        >
          {Math.round(normalizedScore)}/100
        </Text> */}
      </View>

      <View style={styles.beautySegmentsRow}>
        {segments.map((_, index) => {
          const segmentStart =
            index * 20;

          const amount =
            Math.max(
              0,
              Math.min(
                20,
                normalizedScore -
                  segmentStart
              )
            );

          const fillPercentage =
            (amount / 20) * 100;

          return (
            <View
              key={index}
              style={styles.beautySegment}
            >
              <View
                style={[
                  styles.beautySegmentFill,
                  {
                    width:
                      `${fillPercentage}%`,
                    backgroundColor:
                      color,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.beautyProgressLabels}>
        <Text
          style={[
            styles.beautyProgressLabel,
            { color: "#E53935" },
          ]}
        >
          Mauvais
        </Text>

        <Text
          style={[
            styles.beautyProgressLabel,
            { color: "#35A853" },
          ]}
        >
          Excellent
        </Text>
      </View>
    </View>
  );
}

function Chip({
  label,
}: {
  label: string;
}) {
  return (
    <View
      style={
        styles.chip
      }
    >
      <Text
        style={
          styles.chipText
        }
      >
        {label}
      </Text>
    </View>
  );
}

function RatingStars({
  value,
  size = 16,
  color = "#4F9A80",
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  const rating =
    clampRating(value);

  return (
    <View
      style={
        styles.displayStarsRow
      }
    >
      {Array.from({
        length: 5,
      }).map(
        (_, index) => {
          const starNumber =
            index + 1;

          let name:
            | "star"
            | "star-half"
            | "star-outline" =
            "star-outline";

          if (
            rating >=
            starNumber
          ) {
            name = "star";
          } else if (
            rating >=
            starNumber - 0.5
          ) {
            name =
              "star-half";
          }

          return (
            <Ionicons
              key={index}
              name={name}
              size={size}
              color={color}
            />
          );
        }
      )}
    </View>
  );
}

function RatingMetric({
  icon,
  value,
}: {
  icon:
    | "radio-button-on-outline"
    | "checkmark-circle-outline"
    | "bag-handle-outline";
  value: number;
}) {
  const safeValue =
    clampRating(value);

  const percentage =
    (safeValue / 5) * 100;

  return (
    <View
      style={
        styles.metricRow
      }
    >
      <View
        style={
          styles.metricIcon
        }
      >
        <Ionicons
          name={icon}
          size={17}
          color="#3E8A73"
        />
      </View>

      <View
        style={
          styles.metricTrack
        }
      >
        <View
          style={[
            styles.metricFill,
            {
              width:
                `${percentage}%` as any,
            },
          ]}
        />
      </View>

      <Text
        style={
          styles.metricValue
        }
      >
        {formatRating(
          safeValue
        )}
        /5
      </Text>
    </View>
  );
}

function FeedbackQuestion({
  number,
  title,
  icon,
  value,
  onChange,
  disabled,
  leftLabel,
  rightLabel,
}: {
  number: number;
  title: string;
  icon:
    | "radio-button-on-outline"
    | "checkmark-circle-outline"
    | "bag-handle-outline";
  value: number;
  onChange: (
    value: number
  ) => void;
  disabled: boolean;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <View
      style={
        styles.modalQuestion
      }
    >
      <View
        style={
          styles.modalQuestionHeader
        }
      >
        <View
          style={
            styles.modalQuestionIcon
          }
        >
          <Ionicons
            name={icon}
            size={18}
            color="#3E8A73"
          />
        </View>

        <Text
          style={
            styles.modalQuestionTitle
          }
        >
          {number}. {title}
        </Text>
      </View>

      <View
        style={
          styles.modalStarsWrap
        }
      >
        <StarRating
          value={value}
          onChange={
            onChange
          }
          disabled={
            disabled
          }
          accessibilityLabel={
            title
          }
        />
      </View>

      {leftLabel ||
      rightLabel ? (
        <View
          style={
            styles.modalRatingLabels
          }
        >
          <Text
            style={
              styles.modalRatingLabel
            }
          >
            {leftLabel ||
              ""}
          </Text>

          <Text
            style={[
              styles.modalRatingLabel,
              {
                textAlign:
                  "right",
              },
            ]}
          >
            {rightLabel ||
              ""}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ProductDetailsScreen() {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const { token } =
    useAuth();

  const {
    ean,
    returnTo,
    source,
    scanNavigationId,
  } =
    useLocalSearchParams<{
      ean?: string;
      returnTo?: string;
      source?: string;
      scanNavigationId?: string;
    }>();

  const eanStr =
    typeof ean ===
    "string"
      ? ean
      : "";

  const returnToPath =
    typeof returnTo ===
    "string"
      ? returnTo
      : undefined;

  const sourceStr =
    typeof source ===
    "string"
      ? source
      : undefined;

  const scanNavigationIdStr =
    typeof scanNavigationId ===
    "string"
      ? scanNavigationId
      : undefined;

  const safeTransitionProductRef =
    useRef<
      string | null
    >(null);

  const recordedScanRef =
    useRef<
      string | null
    >(null);

  const initializedFeedbackProductRef =
    useRef<
      number | null
    >(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } =
    useProductByEan(
      eanStr
    );

  const product =
    data as
      | Product
      | undefined;

  const productUid =
    product?.uid;

  const {
    isFavorite,
    toggleFavorite,
    isMutating:
      favLoading,
  } =
    useFavorites(
      !!token
    );

  const {
    myFeedbackQuery,
    summaryQuery,
    submitFeedback,
    deleteFeedback,
    isSubmitting,
    isDeleting,
  } =
    useProductFeedback({
      productId:
        productUid,

      ean: eanStr,

      authenticated:
        Boolean(token),
    });

  const recordScanMutation =
    useRecordScan();

  const [
    effectivenessRating,
    setEffectivenessRating,
  ] = useState(0);

  const [
    needsRating,
    setNeedsRating,
  ] = useState(0);

  const [
    repurchaseRating,
    setRepurchaseRating,
  ] = useState(0);

  const [
    comment,
    setComment,
  ] = useState("");

  const [
    showAllIngredients,
    setShowAllIngredients,
  ] = useState(false);

  const [
    showImage,
    setShowImage,
  ] = useState(false);

  const [
    showFeedbackModal,
    setShowFeedbackModal,
  ] = useState(false);

  const isFav =
    isFavorite(
      productUid
    );

  useEffect(() => {
    if (!eanStr) {
      return;
    }

    void refetch()
      .catch(
        () => undefined
      );
  }, [
    eanStr,
    refetch,
  ]);

  useEffect(() => {
    if (
      !eanStr ||
      !productUid ||
      sourceStr ===
        "scan"
    ) {
      return;
    }

    const productTransitionKey =
      `${eanStr}:${productUid}`;

    if (
      safeTransitionProductRef.current ===
        productTransitionKey
    ) {
      return;
    }

    safeTransitionProductRef.current =
      productTransitionKey;

    void maybeShowTimeInterstitial(
      "product-result"
    ).catch((adError) => {
      if (__DEV__) {
        console.warn(
          "[Ads] product result checkpoint failed",
          adError
        );
      }
    });
  }, [
    eanStr,
    productUid,
    sourceStr,
  ]);

  useEffect(() => {
    if (
      sourceStr !==
        "scan" ||
      !productUid
    ) {
      return;
    }

    const navigationKey =
      scanNavigationIdStr ||
      `scan:${eanStr}`;

    if (
      recordedScanRef.current ===
        navigationKey
    ) {
      return;
    }

    recordedScanRef.current =
      navigationKey;

    void recordSuccessfulCameraScan(
      navigationKey
    )
      .then(({ processed }) => {
        if (!processed || !token) {
          return;
        }

        recordScanMutation.mutate(
          productUid,
          {
            onError:
              (
                scanError
              ) => {
                if (__DEV__) {
                  console.info(
                    "[scan] recording failed",
                    {
                      status:
                        (
                          scanError as {
                            status?: number;
                          }
                        )?.status,
                    }
                  );
                }
              },
          }
        );
      })
      .catch((scanError) => {
        if (__DEV__) {
          console.warn(
            "[Ads] successful camera scan could not be processed",
            scanError
          );
        }
      });
  }, [
    eanStr,
    productUid,
    recordScanMutation.mutate,
    scanNavigationIdStr,
    sourceStr,
    token,
  ]);

  /*
   * Load existing user's feedback into form.
   */
  useEffect(() => {
    if (!token) {
      initializedFeedbackProductRef.current =
        null;

      setEffectivenessRating(
        0
      );

      setNeedsRating(
        0
      );

      setRepurchaseRating(
        0
      );

      setComment("");

      return;
    }

    if (
      !productUid ||
      !myFeedbackQuery.isSuccess ||
      initializedFeedbackProductRef.current ===
        productUid
    ) {
      return;
    }

    const existingFeedback =
      myFeedbackQuery.data;

    initializedFeedbackProductRef.current =
      productUid;

    setEffectivenessRating(
      existingFeedback
        ?.effectivenessRating ??
        0
    );

    setNeedsRating(
      existingFeedback
        ?.needsRating ??
        0
    );

    setRepurchaseRating(
      existingFeedback
        ?.repurchaseRating ??
        0
    );

    setComment(
      existingFeedback
        ?.comment ??
        ""
    );
  }, [
    myFeedbackQuery.data,
    myFeedbackQuery.isSuccess,
    productUid,
    token,
  ]);

  useEffect(() => {
    if (
      token &&
      (
        myFeedbackQuery.error as
          | {
              status?: number;
            }
          | null
      )?.status === 401
    ) {
      router.push(
        "/(tabs)/(auth)/login"
      );
    }
  }, [
    myFeedbackQuery.error,
    router,
    token,
  ]);

  const requireAuthentication =
    () => {
      if (token) {
        return true;
      }

      router.push(
        "/(tabs)/(auth)/login"
      );

      return false;
    };

  const openFeedback =
    () => {
      if (
        !requireAuthentication()
      ) {
        return;
      }

      setShowFeedbackModal(
        true
      );
    };

  const onPressHeart =
    async () => {
      if (!token) {
        router.push(
          "/(tabs)/(auth)/login"
        );

        return;
      }

      if (
        typeof productUid ===
        "number"
      ) {
        await toggleFavorite(
          productUid
        );
      }
    };

  const setRating = (
    setter:
      React.Dispatch<
        React.SetStateAction<number>
      >,
    value: number
  ) => {
    if (
      !requireAuthentication()
    ) {
      return;
    }

    setter(value);
  };

  const handleSubmitFeedback =
    async () => {
      if (
        !requireAuthentication()
      ) {
        return;
      }

      if (
        effectivenessRating <
          1 ||
        needsRating < 1 ||
        repurchaseRating < 1
      ) {
        Alert.alert(
          "Avis incomplet",
          "Veuillez attribuer une note de 1 à 5 pour chaque question."
        );

        return;
      }

      try {
        await submitFeedback({
          effectivenessRating,
          needsRating,
          repurchaseRating,

          comment:
            comment.trim() ||
            undefined,
        });

        setShowFeedbackModal(
          false
        );

        Alert.alert(
          "Merci !",
          "Votre avis a bien été enregistré."
        );
      } catch (
        submitError:
          unknown
      ) {
        const status =
          (
            submitError as {
              status?: number;
            }
          )?.status;

        if (
          status === 401
        ) {
          setShowFeedbackModal(
            false
          );

          router.push(
            "/(tabs)/(auth)/login"
          );

          return;
        }

        Alert.alert(
          "Envoi impossible",
          status === 400
            ? "Vérifiez que chaque note est comprise entre 1 et 5."
            : "Votre avis n’a pas pu être envoyé. Vérifiez votre connexion puis réessayez."
        );
      }
    };

  const confirmDeleteFeedback =
    () => {
      Alert.alert(
        "Supprimer votre avis ?",
        "Cette action retirera votre avis de ce produit.",
        [
          {
            text: "Annuler",
            style: "cancel",
          },

          {
            text: "Supprimer",
            style:
              "destructive",

            onPress: () => {
              void (async () => {
                try {
                  await deleteFeedback();

                  initializedFeedbackProductRef.current =
                    productUid ??
                    null;

                  setEffectivenessRating(
                    0
                  );

                  setNeedsRating(
                    0
                  );

                  setRepurchaseRating(
                    0
                  );

                  setComment("");

                  setShowFeedbackModal(
                    false
                  );
                } catch (
                  deleteError:
                    unknown
                ) {
                  if (
                    (
                      deleteError as {
                        status?: number;
                      }
                    )?.status ===
                    401
                  ) {
                    setShowFeedbackModal(
                      false
                    );

                    router.push(
                      "/(tabs)/(auth)/login"
                    );

                    return;
                  }

                  Alert.alert(
                    "Suppression impossible",
                    "Votre avis n’a pas pu être supprimé. Réessayez dans un instant."
                  );
                }
              })();
            },
          },
        ]
      );
    };

  /*
   * Keep the same returnTo strategy we fixed
   * on the other nested screens.
   */
  const handleBack =
    () => {
      if (__DEV__) {
        console.debug(
          "[nav:product-back]",
          {
            pathname,

            params: {
              ean,
              returnTo,
            },

            canGoBack:
              router.canGoBack(),

            returnTo:
              returnToPath,
          }
        );
      }

      if (returnToPath) {
        router.replace(
          returnToPath as never
        );

        return;
      }

      if (
        router.canGoBack()
      ) {
        router.back();

        return;
      }

      router.replace(
        "/(tabs)/(main)"
      );
    };

  if (isLoading) {
    return (
      <ProductDetailLoader />
    );
  }

  const productErrorStatus =
    (
      error as
        | {
            status?: number;
          }
        | null
    )?.status;

  if (
    isError &&
    productErrorStatus ===
      404
  ) {
    return (
      <View
        style={
          styles.notFoundPage
        }
      >
        <Text
          style={
            styles.notFoundTitle
          }
        >
          Produit non trouvé
        </Text>

        <Text
          style={
            styles.notFoundSub
          }
        >
          Ce produit n&apos;est
          pas encore disponible
          sur BeautySafe.
        </Text>

        <View
          style={
            styles.notFoundArt
          }
        >
          <NoProduct
            width={300}
            height={300}
          />
        </View>

        <Text
          style={
            styles.notFoundHint
          }
        >
          Vous pouvez nous
          envoyer quelques
          photos afin que nous
          puissions l&apos;ajouter
          prochainement.
        </Text>

        <Pressable
          style={
            styles.addProductBtn
          }
          onPress={() =>
            router.push({
              pathname:
                "/(tabs)/(main)/unavailable-product",

              params:
                eanStr
                  ? {
                      ean:
                        eanStr,
                    }
                  : {},
            })
          }
        >
          <Text
            style={
              styles.addProductBtnText
            }
          >
            Ajouter ce produit
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.backBtn
          }
          onPress={
            handleBack
          }
        >
          <Text
            style={
              styles.backBtnText
            }
          >
            Retour
          </Text>
        </Pressable>
      </View>
    );
  }

  if (
    isError ||
    !product
  ) {
    return (
      <View
        style={
          styles.center
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Chargement
          impossible
        </Text>

        <Text
          style={
            styles.muted
          }
        >
          Vérifiez votre
          connexion puis
          réessayez.
        </Text>

        <Pressable
          style={
            styles.btn
          }
          onPress={() =>
            void refetch()
          }
        >
          <Text
            style={
              styles.btnText
            }
          >
            Réessayer
          </Text>
        </Pressable>
      </View>
    );
  }

  const heroImage =
    product.images?.[0]
      ?.image ||
    product.images?.[0]
      ?.thumbnail ||
    (typeof (
      product as any
    )?.image === "string"
      ? (
          product as any
        ).image
      : undefined);

  const score20 =
    Number(
      product.validScore ??
        0
    );
const ratingsCount =
  Number(
    product.ratingsCount ?? 0
  ) || 0;

const averageRating =
  clampRating(
    product.averageRating ?? 0
  );

const effectivenessAverage =
  clampRating(
    product.effectivenessAverage ?? 0
  );

const needsAverage =
  clampRating(
    product.needsAverage ?? 0
  );

const repurchaseAverage =
  clampRating(
    product.repurchaseAverage ?? 0
  );

  const composition =
    Array.isArray(
      product.composition
    )
      ? product.composition
      : [];

  const ingredientChips =
    showAllIngredients
      ? composition
      : composition.slice(
          0,
          INITIAL_INGREDIENT_LIMIT
        );

  const existingFeedback =
    Boolean(
      myFeedbackQuery.data
    );

  return (
    <View
      style={
        styles.screen
      }
    >
      <ScrollView
        style={
          styles.page
        }
        contentContainerStyle={
          styles.pageContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* TOP BAR */}
        <View
          style={
            styles.topBar
          }
        >
          <Pressable
            onPress={
              handleBack
            }
            style={
              styles.iconBtn
            }
          >
            <ArrowLeftIcon
              width={22}
              height={22}
            />
          </Pressable>

          <Text
            style={
              styles.topTitle
            }
          >
            Détail Produit
          </Text>

          <Pressable
            onPress={
              onPressHeart
            }
            style={
              styles.iconBtn
            }
            disabled={
              favLoading
            }
          >
            {isFav ? (
              <HeartRedIcon
                width={24}
                height={24}
              />
            ) : (
              <HeartIcon
                width={24}
                height={24}
              />
            )}
          </Pressable>
        </View>

        {/* PRODUCT IMAGE */}
        <View
          style={
            styles.heroCard
          }
        >
          {heroImage ? (
            <Pressable
              onPress={() =>
                setShowImage(
                  true
                )
              }
            >
              <Image
                source={{
                  uri: heroImage,
                }}
                style={
                  styles.heroImage
                }
                contentFit="cover"
              />
            </Pressable>
          ) : (
            <View
              style={[
                styles.heroImage,
                styles.heroPlaceholder,
              ]}
            >
              <Text
                style={
                  styles.muted
                }
              >
                Aucune image
              </Text>
            </View>
          )}
        </View>

        {/* PRODUCT SUMMARY */}
        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.title
            }
          >
            {product.name}
          </Text>

          <Text
            style={
              styles.desc
            }
          >
            {product.brand?.name
              ? `${product.brand.name} • `
              : ""}

            {product.ean
              ? `EAN ${product.ean}`
              : ""}
          </Text>

          <View
            style={
              styles.productScoresRow
            }
          >
            <View style={styles.beautyScoreBox}>
              <BeautyScoreBar
                score={score20}
              />
            </View>

            {/* Compact user rating, inspired by first screenshot */}
            <Pressable
              style={
                styles.userRatingCard
              }
              onPress={
                openFeedback
              }
            >
              <View
                style={
                  styles.userRatingTop
                }
              >
                <Text
                  style={
                    styles.userRatingLabel
                  }
                >
                  Score utilisateurs
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#4E8C77"
                />
              </View>

              {ratingsCount >
              0 ? (
                <>
                  <View
                    style={
                      styles.userRatingValueRow
                    }
                  >
                    <Ionicons
                      name="star"
                      size={22}
                      color="#D9A12A"
                    />

                    <Text
                      style={
                        styles.userRatingValue
                      }
                    >
                      {formatRating(
                        averageRating
                      )}
                    </Text>

                    <Text
                      style={
                        styles.userRatingOutOf
                      }
                    >
                      /5
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.userRatingCount
                    }
                  >
                    Basé sur{" "}
                    {ratingsCount}{" "}
                    {ratingsCount >
                    1
                      ? "avis"
                      : "avis"}
                  </Text>
                </>
              ) : (
                <>
                  <View
                    style={
                      styles.userRatingValueRow
                    }
                  >
                    <Ionicons
                      name="star-outline"
                      size={22}
                      color="#D9A12A"
                    />

                    <Text
                      style={
                        styles.noRatingValue
                      }
                    >
                      Aucun avis
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.userRatingCount
                    }
                  >
                    Soyez le premier
                    à donner votre
                    avis
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* INGREDIENTS */}
        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Ingrédients
          </Text>

          {ingredientChips.length ===
          0 ? (
            <Text
              style={
                styles.muted
              }
            >
              Aucun ingrédient
              disponible.
            </Text>
          ) : (
            <View
              style={
                styles.chipWrap
              }
            >
              {ingredientChips.map(
                (
                  ingredient,
                  index
                ) => (
                  <Chip
                    key={
                      ingredient.id ??
                      index
                    }
                    label={
                      ingredient.name ||
                      ingredient.officialName ||
                      "Ingrédient"
                    }
                  />
                )
              )}
            </View>
          )}

          {composition.length >
          INITIAL_INGREDIENT_LIMIT ? (
            <Pressable
              onPress={() =>
                setShowAllIngredients(
                  (
                    current
                  ) =>
                    !current
                )
              }
              style={
                styles.moreBtn
              }
            >
              <Text
                style={
                  styles.moreText
                }
              >
                {showAllIngredients
                  ? "Voir moins"
                  : `+ ${
                      composition.length -
                      INITIAL_INGREDIENT_LIMIT
                    } autres`}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* USER REVIEW STATISTICS */}
        <View
          style={[
            styles.card,
            styles.reviewsCard,
          ]}
        >
          <View
            style={
              styles.reviewsHeader
            }
          >
            <Text
              style={
                styles.sectionTitleNoMargin
              }
            >
              Avis des
              utilisateurs
            </Text>

            <View
              style={
                styles.reviewCountPill
              }
            >
              <Text
                style={
                  styles.reviewCountPillText
                }
              >
                {ratingsCount}{" "}
                {ratingsCount >
                1
                  ? "avis"
                  : "avis"}
              </Text>
            </View>
          </View>

          {summaryQuery.isLoading ? (
            <View
              style={
                styles.summaryLoading
              }
            >
              <ActivityIndicator
                size="small"
                color="#478E77"
              />

              <Text
                style={
                  styles.summaryLoadingText
                }
              >
                Chargement des
                avis...
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.reviewStatistics
              }
            >
              {/* LEFT SIDE */}
              <View
                style={
                  styles.reviewOverall
                }
              >
                <View
                  style={
                    styles.overallRatingRow
                  }
                >
                  <Text
                    style={
                      styles.overallRating
                    }
                  >
                    {formatRating(
                      averageRating
                    )}
                  </Text>

                  <Text
                    style={
                      styles.overallOutOf
                    }
                  >
                    /5
                  </Text>
                </View>

                <RatingStars
                  value={
                    averageRating
                  }
                  size={16}
                />

                <View
                  style={
                    styles.satisfactionRow
                  }
                >
                  <Text
                    style={
                      styles.satisfactionText
                    }
                  >
                    {getSatisfactionText(
                      averageRating
                    )}
                  </Text>

                  {ratingsCount >
                  0 ? (
                    <Ionicons
                      name="happy-outline"
                      size={13}
                      color="#478E77"
                    />
                  ) : null}
                </View>
              </View>

              <View
                style={
                  styles.reviewDivider
                }
              />

              {/* RIGHT SIDE */}
              <View
                style={
                  styles.reviewMetrics
                }
              >
                <RatingMetric
                  icon="radio-button-on-outline"
                  value={
                    effectivenessAverage
                  }
                />

                <RatingMetric
                  icon="checkmark-circle-outline"
                  value={
                    needsAverage
                  }
                />

                <RatingMetric
                  icon="bag-handle-outline"
                  value={
                    repurchaseAverage
                  }
                />
              </View>
            </View>
          )}

          {/* Button opens feedback modal */}
          <Pressable
            onPress={
              openFeedback
            }
            style={({
              pressed,
            }) => [
              styles.giveFeedbackBtn,

              pressed &&
                styles.giveFeedbackBtnPressed,
            ]}
          >
            <View
              style={
                styles.giveFeedbackIcon
              }
            >
              <Ionicons
                name="create-outline"
                size={24}
                color="#3F3B37"
              />
            </View>

            <Text
              style={
                styles.giveFeedbackText
              }
            >
              {existingFeedback
                ? "Modifier mon avis sur ce produit"
                : "Donner mon avis sur ce produit"}
            </Text>

            <Ionicons
              name="chevron-forward"
              size={21}
              color="#3F3B37"
            />
          </Pressable>
        </View>
      </ScrollView>

      {/* FULL IMAGE MODAL */}
      <Modal
        visible={
          showImage
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowImage(
            false
          )
        }
      >
        <View
          style={
            styles.imageModal
          }
        >
          <Pressable
            style={
              styles.imageModalClose
            }
            onPress={() =>
              setShowImage(
                false
              )
            }
          >
            <Ionicons
              name="close"
              size={25}
              color="#FFFFFF"
            />
          </Pressable>

          {heroImage ? (
            <Image
              source={{
                uri: heroImage,
              }}
              style={
                styles.fullImage
              }
              contentFit="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* FEEDBACK MODAL */}
      <Modal
        visible={
          showFeedbackModal
        }
        animationType="slide"
        onRequestClose={() =>
          setShowFeedbackModal(
            false
          )
        }
      >
        <View
          style={
            styles.feedbackModalPage
          }
        >
          {/* Modal top bar */}
          <View
            style={
              styles.feedbackModalHeader
            }
          >
            <Pressable
              onPress={() =>
                setShowFeedbackModal(
                  false
                )
              }
              style={
                styles.feedbackModalBack
              }
            >
              <Ionicons
                name="arrow-back"
                size={25}
                color="#272522"
              />
            </Pressable>

            <Text
              style={
                styles.feedbackModalTitle
              }
            >
              Donner mon avis
            </Text>

            <View
              style={
                styles.feedbackModalSpacer
              }
            />
          </View>

          <ScrollView
            style={
              styles.feedbackModalScroll
            }
            contentContainerStyle={
              styles.feedbackModalContent
            }
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
          >
            {/* Intro */}
            <View
              style={
                styles.feedbackIntro
              }
            >
              <View
                style={
                  styles.feedbackIntroIcon
                }
              >
                <Ionicons
                  name="heart-circle-outline"
                  size={45}
                  color="#39816B"
                />
              </View>

              <View
                style={
                  styles.feedbackIntroCopy
                }
              >
                <Text
                  style={
                    styles.feedbackIntroTitle
                  }
                >
                  Votre avis compte !
                </Text>

                <Text
                  style={
                    styles.feedbackIntroText
                  }
                >
                  Partagez votre
                  expérience pour
                  aider la communauté
                  BeautySafe.
                </Text>
              </View>
            </View>

            {myFeedbackQuery.isLoading ? (
              <View
                style={
                  styles.feedbackLoadingRow
                }
              >
                <ActivityIndicator
                  size="small"
                  color="#39816B"
                />

                <Text
                  style={
                    styles.feedbackHelp
                  }
                >
                  Chargement de votre
                  avis...
                </Text>
              </View>
            ) : null}

            {/* Question 1 */}
            <FeedbackQuestion
              number={1}
              title="A-t-il été efficace ?"
              icon="radio-button-on-outline"
              value={
                effectivenessRating
              }
              onChange={(
                value
              ) =>
                setRating(
                  setEffectivenessRating,
                  value
                )
              }
              disabled={
                isSubmitting ||
                isDeleting
              }
              leftLabel="Pas du tout"
              rightLabel="Très efficace"
            />

            <View
              style={
                styles.questionSeparator
              }
            />

            {/* Question 2 */}
            <FeedbackQuestion
              number={2}
              title="A-t-il répondu à vos besoins ?"
              icon="checkmark-circle-outline"
              value={
                needsRating
              }
              onChange={(
                value
              ) =>
                setRating(
                  setNeedsRating,
                  value
                )
              }
              disabled={
                isSubmitting ||
                isDeleting
              }
              leftLabel="Pas du tout"
              rightLabel="Parfaitement"
            />

            <View
              style={
                styles.questionSeparator
              }
            />

            {/*
              Question 3 stays STARS,
              exactly as requested.
            */}
            <FeedbackQuestion
              number={3}
              title="Le rachèteriez-vous ?"
              icon="bag-handle-outline"
              value={
                repurchaseRating
              }
              onChange={(
                value
              ) =>
                setRating(
                  setRepurchaseRating,
                  value
                )
              }
              disabled={
                isSubmitting ||
                isDeleting
              }
              leftLabel="Pas du tout"
              rightLabel="Certainement"
            />

            {/* Comment */}
            <View
              style={
                styles.commentSection
              }
            >
              <Text
                style={
                  styles.commentLabel
                }
              >
                Un commentaire ?
              </Text>

              <TextInput
                value={
                  comment
                }
                onChangeText={
                  setComment
                }
                editable={
                  Boolean(token) &&
                  !isSubmitting &&
                  !isDeleting
                }
                multiline
                maxLength={2000}
                textAlignVertical="top"
                placeholder="Laissez un commentaire (facultatif)"
                placeholderTextColor="rgba(63,59,55,0.42)"
                style={
                  styles.commentInput
                }
              />
            </View>

            {/* Anonymous information */}
            <View
              style={
                styles.anonymousBox
              }
            >
              <View
                style={
                  styles.anonymousIcon
                }
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color="#428A74"
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.anonymousTitle
                  }
                >
                  Votre expérience
                  compte
                </Text>

                <Text
                  style={
                    styles.anonymousText
                  }
                >
                  Votre avis aide les
                  autres utilisateurs
                  à mieux choisir.
                </Text>
              </View>
            </View>

            {myFeedbackQuery.isError &&
            ![
              401,
              404,
            ].includes(
              Number(
                (
                  myFeedbackQuery.error as {
                    status?: number;
                  }
                )?.status
              )
            ) ? (
              <Text
                style={
                  styles.feedbackError
                }
              >
                Votre avis n’a pas pu
                être chargé. Vous
                pouvez réessayer.
              </Text>
            ) : null}

            {/* Submit */}
            <Pressable
              style={[
                styles.feedbackSubmitBtn,

                (isSubmitting ||
                  isDeleting) &&
                  styles.feedbackButtonDisabled,
              ]}
              onPress={() =>
                void handleSubmitFeedback()
              }
              disabled={
                isSubmitting ||
                isDeleting
              }
            >
              {isSubmitting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Text
                    style={
                      styles.feedbackSubmitText
                    }
                  >
                    {existingFeedback
                      ? "Modifier mon avis"
                      : "Envoyer mon avis"}
                  </Text>

                  <Ionicons
                    name="paper-plane-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                </>
              )}
            </Pressable>

            {existingFeedback ? (
              <Pressable
                onPress={
                  confirmDeleteFeedback
                }
                disabled={
                  isSubmitting ||
                  isDeleting
                }
                style={
                  styles.deleteFeedbackBtn
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color="#A55B69"
                />

                <Text
                  style={
                    styles.deleteFeedbackText
                  }
                >
                  {isDeleting
                    ? "Suppression..."
                    : "Supprimer mon avis"}
                </Text>
              </Pressable>
            ) : null}

            {/* Preview inside feedback page */}
            <View
              style={
                styles.feedbackPreview
              }
            >
              <View
                style={
                  styles.feedbackPreviewHeader
                }
              >
                <Text
                  style={
                    styles.feedbackPreviewTitle
                  }
                >
                  Aperçu des avis
                  utilisateurs
                </Text>

                <Text
                  style={
                    styles.feedbackPreviewCount
                  }
                >
                  {ratingsCount} avis
                </Text>
              </View>

              <View
                style={
                  styles.reviewStatistics
                }
              >
                <View
                  style={
                    styles.reviewOverall
                  }
                >
                  <View
                    style={
                      styles.overallRatingRow
                    }
                  >
                    <Text
                      style={
                        styles.overallRating
                      }
                    >
                      {formatRating(
                        averageRating
                      )}
                    </Text>

                    <Text
                      style={
                        styles.overallOutOf
                      }
                    >
                      /5
                    </Text>
                  </View>

                  <RatingStars
                    value={
                      averageRating
                    }
                    size={15}
                  />

                  <View
                    style={
                      styles.satisfactionRow
                    }
                  >
                    <Text
                      style={
                        styles.satisfactionText
                      }
                    >
                      {getSatisfactionText(
                        averageRating
                      )}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.reviewDivider
                  }
                />

                <View
                  style={
                    styles.reviewMetrics
                  }
                >
                  <RatingMetric
                    icon="radio-button-on-outline"
                    value={
                      effectivenessAverage
                    }
                  />

                  <RatingMetric
                    icon="checkmark-circle-outline"
                    value={
                      needsAverage
                    }
                  />

                  <RatingMetric
                    icon="bag-handle-outline"
                    value={
                      repurchaseAverage
                    }
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#FBF8F4",
    },

    page: {
      flex: 1,
      backgroundColor:
        "#FBF8F4",
      paddingTop: 20,
    },

    pageContent: {
      padding: 16,
      paddingBottom: 32,
      gap: 14,
    },

    /*
     * Header
     */
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingVertical: 6,
    },

    topTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: "#3F3B37",
    },

    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 999,

      backgroundColor:
        "rgba(0,0,0,0.05)",

      alignItems: "center",
      justifyContent:
        "center",
    },

    /*
     * Product image
     */
    heroCard: {
      borderRadius: 22,

      backgroundColor:
        "#F4E4DE",

      overflow: "hidden",
    },

    heroImage: {
      width: "100%",
      height: 260,
    },

    heroPlaceholder: {
      alignItems: "center",
      justifyContent:
        "center",
    },

    /*
     * Generic cards
     */
    card: {
      borderRadius: 22,

      backgroundColor:
        "#FFFFFF",

      padding: 16,

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.035)",
    },

    title: {
      fontSize: 26,
      fontWeight: "900",
      color: "#3F3B37",

      lineHeight: 32,
    },

    desc: {
      marginTop: 6,

      color:
        "rgba(63,59,55,0.65)",

      fontSize: 14,
      lineHeight: 18,
    },

    /*
     * Product score area
     */
    productScoresRow: {
      marginTop: 16,

      flexDirection: "row",

      alignItems:
        "stretch",

      gap: 10,
    },

beautyScoreBox: {
  flex: 1,
  minHeight: 108,
  borderRadius: 18,
  padding: 13,
  backgroundColor: "#FBF8F4",
  justifyContent: "center",
},

beautyProgressContainer: {
  width: "100%",
},

beautyProgressTop: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
},

beautyProgressTitle: {
  color: "#3F3B37",
  fontSize: 11,
  fontWeight: "800",
},

beautyProgressValue: {
  fontSize: 13,
  fontWeight: "900",
},

beautySegmentsRow: {
  width: "100%",
  flexDirection: "row",
  gap: 3,
},

beautySegment: {
  flex: 1,
  height: 15,
  borderRadius: 3,
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "rgba(63,59,55,0.10)",
  overflow: "hidden",
},

beautySegmentFill: {
  height: "100%",
  borderRadius: 2,
},

beautyProgressLabels: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 8,
},

beautyProgressLabel: {
  fontSize: 8,
  fontWeight: "800",
},

    /*
     * Small user rating card
     */
    userRatingCard: {
      flex: 1,

      minHeight: 108,

      borderRadius: 18,

      backgroundColor:
        "#F7FAF8",

      padding: 13,

      justifyContent:
        "center",

      borderWidth: 1,

      borderColor:
        "rgba(70,135,112,0.08)",
    },

    userRatingTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    userRatingLabel: {
      color: "#A17D34",

      fontSize: 10,
      fontWeight: "700",
    },

    userRatingValueRow: {
      flexDirection: "row",
      alignItems:
        "baseline",

      gap: 4,

      marginTop: 8,
    },

    userRatingValue: {
      color: "#30302E",

      fontSize: 22,
      fontWeight: "900",
    },

    userRatingOutOf: {
      color:
        "rgba(48,48,46,0.76)",

      fontSize: 13,
      fontWeight: "700",
    },

    noRatingValue: {
      color: "#3F3B37",

      fontSize: 15,
      fontWeight: "900",
    },

    userRatingCount: {
      marginTop: 5,

      color: "#488773",

      fontSize: 10,
      fontWeight: "600",
    },

    /*
     * Ingredients
     */
    sectionTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: "#3F3B37",
      marginBottom: 12,
    },

    sectionTitleNoMargin: {
      fontSize: 18,
      fontWeight: "900",
      color: "#3F3B37",
    },

    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },

    chip: {
      paddingVertical: 10,
      paddingHorizontal: 14,

      borderRadius: 999,

      backgroundColor:
        "#F4F3F1",
    },

    chipText: {
      color: "#3F3B37",
      fontWeight: "700",
    },

    moreBtn: {
      marginTop: 12,
      alignSelf:
        "flex-start",
    },

    moreText: {
      color:
        "rgba(63,59,55,0.55)",

      fontWeight: "700",
    },

    /*
     * Reviews statistics
     */
    reviewsCard: {
      marginBottom: 6,
    },

    reviewsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      marginBottom: 18,
    },

    reviewCountPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,

      borderRadius: 999,

      backgroundColor:
        "#EAF5F0",
    },

    reviewCountPillText: {
      color: "#468873",

      fontSize: 10,
      fontWeight: "700",
    },

    summaryLoading: {
      paddingVertical: 20,

      flexDirection: "row",

      alignItems: "center",
      justifyContent:
        "center",

      gap: 8,
    },

    summaryLoadingText: {
      color:
        "rgba(63,59,55,0.55)",

      fontSize: 12,
    },

    reviewStatistics: {
      flexDirection: "row",
      alignItems:
        "stretch",

      minHeight: 120,
    },

    reviewOverall: {
      width: 120,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 4,
    },

    overallRatingRow: {
      flexDirection: "row",
      alignItems:
        "baseline",

      justifyContent:
        "center",
    },

    overallRating: {
      color: "#111111",

      fontSize: 34,
      lineHeight: 39,

      fontWeight: "900",
    },

    overallOutOf: {
      color: "#1D1D1B",

      fontSize: 15,
      fontWeight: "700",
    },

    displayStarsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 1,
    },

    satisfactionRow: {
      flexDirection: "row",
      alignItems: "center",

      gap: 4,

      marginTop: 8,
    },

    satisfactionText: {
      color: "#668579",

      fontSize: 9,
      fontWeight: "600",
    },

    reviewDivider: {
      width: 1,

      marginVertical: 6,

      backgroundColor:
        "rgba(63,59,55,0.08)",
    },

    reviewMetrics: {
      flex: 1,

      justifyContent:
        "space-around",

      paddingLeft: 14,
    },

    metricRow: {
      flexDirection: "row",
      alignItems: "center",

      gap: 8,
    },

    metricIcon: {
      width: 30,
      height: 30,

      borderRadius: 15,

      backgroundColor:
        "#F1F8F5",

      alignItems: "center",
      justifyContent:
        "center",
    },

    metricTrack: {
      flex: 1,

      height: 4,

      borderRadius: 999,

      backgroundColor:
        "#E7EDEA",

      overflow: "hidden",
    },

    metricFill: {
      height: "100%",

      borderRadius: 999,

      backgroundColor:
        "#559A82",
    },

    metricValue: {
      width: 36,

      color: "#222222",

      fontSize: 10,

      textAlign: "right",

      fontVariant: [
        "tabular-nums",
      ],
    },

    /*
     * Give feedback button
     */
    giveFeedbackBtn: {
      minHeight: 58,

      marginTop: 18,

      borderRadius: 16,

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.08)",

      backgroundColor:
        "#FFFFFF",

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 14,

      shadowColor: "#000",

      shadowOpacity: 0.03,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 1,
    },

    giveFeedbackBtnPressed: {
      opacity: 0.72,
    },

    giveFeedbackIcon: {
      width: 34,
      alignItems:
        "center",

      marginRight: 8,
    },

    giveFeedbackText: {
      flex: 1,

      color: "#292725",

      fontSize: 13,
      fontWeight: "800",
    },

    /*
     * Full image
     */
    imageModal: {
      flex: 1,

      backgroundColor:
        "rgba(0,0,0,0.95)",

      justifyContent:
        "center",

      alignItems: "center",
    },

    fullImage: {
      width: "100%",
      height: "100%",
    },

    imageModalClose: {
      position: "absolute",

      top: 50,
      right: 20,

      zIndex: 10,

      width: 42,
      height: 42,

      borderRadius: 21,

      backgroundColor:
        "rgba(255,255,255,0.20)",

      alignItems: "center",
      justifyContent:
        "center",
    },

    /*
     * Feedback modal
     */
    feedbackModalPage: {
      flex: 1,

      backgroundColor:
        "#FBF8F4",
    },

    feedbackModalHeader: {
      height: 74,

      paddingTop: 24,

      paddingHorizontal: 14,

      backgroundColor:
        "#FFFFFF",

      flexDirection: "row",
      alignItems: "center",

      borderBottomWidth: 1,

      borderBottomColor:
        "rgba(63,59,55,0.06)",
    },

    feedbackModalBack: {
      width: 44,
      height: 44,

      alignItems: "center",
      justifyContent:
        "center",
    },

    feedbackModalTitle: {
      flex: 1,

      textAlign: "center",

      color: "#201F1D",

      fontSize: 18,
      fontWeight: "900",
    },

    feedbackModalSpacer: {
      width: 44,
    },

    feedbackModalScroll: {
      flex: 1,
    },

    feedbackModalContent: {
      padding: 14,

      paddingBottom: 40,

      gap: 14,
    },

    /*
     * Intro
     */
    feedbackIntro: {
      borderRadius: 24,

      backgroundColor:
        "#FFFFFF",

      padding: 18,

      flexDirection: "row",
      alignItems: "center",

      gap: 14,
    },

    feedbackIntroIcon: {
      width: 72,
      height: 72,

      borderRadius: 36,

      backgroundColor:
        "#F0F7F4",

      alignItems: "center",
      justifyContent:
        "center",
    },

    feedbackIntroCopy: {
      flex: 1,
    },

    feedbackIntroTitle: {
      color: "#171715",

      fontSize: 16,
      fontWeight: "900",

      marginBottom: 5,
    },

    feedbackIntroText: {
      color:
        "rgba(23,23,21,0.58)",

      fontSize: 12,
      lineHeight: 18,
    },

    feedbackLoadingRow: {
      flexDirection: "row",

      alignItems: "center",
      justifyContent:
        "center",

      gap: 8,

      paddingVertical: 8,
    },

    feedbackHelp: {
      color:
        "rgba(63,59,55,0.6)",

      fontSize: 13,
    },

    /*
     * Questions
     */
    modalQuestion: {
      backgroundColor:
        "#FFFFFF",

      borderRadius: 20,

      padding: 16,
    },

    modalQuestionHeader: {
      flexDirection: "row",
      alignItems: "center",

      gap: 10,

      marginBottom: 15,
    },

    modalQuestionIcon: {
      width: 36,
      height: 36,

      borderRadius: 18,

      backgroundColor:
        "#F1F8F5",

      alignItems: "center",
      justifyContent:
        "center",
    },

    modalQuestionTitle: {
      flex: 1,

      color: "#282624",

      fontSize: 14,
      fontWeight: "900",
    },

    modalStarsWrap: {
      alignItems: "center",

      paddingVertical: 4,
    },

    modalRatingLabels: {
      marginTop: 8,

      paddingHorizontal: 5,

      flexDirection: "row",
      justifyContent:
        "space-between",
    },

    modalRatingLabel: {
      flex: 1,

      color:
        "rgba(63,59,55,0.50)",

      fontSize: 9,
    },

    questionSeparator: {
      height: 1,

      marginHorizontal: 14,

      backgroundColor:
        "rgba(63,59,55,0.07)",
    },

    /*
     * Comment
     */
    commentSection: {
      backgroundColor:
        "#FFFFFF",

      padding: 16,

      borderRadius: 20,
    },

    commentLabel: {
      color: "#3F3B37",

      fontSize: 14,
      fontWeight: "900",

      marginBottom: 10,
    },

    commentInput: {
      minHeight: 110,

      borderRadius: 16,

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.10)",

      backgroundColor:
        "#FBF8F4",

      paddingHorizontal: 14,
      paddingVertical: 13,

      color: "#3F3B37",

      fontSize: 14,
      lineHeight: 20,
    },

    /*
     * Privacy/info
     */
    anonymousBox: {
      minHeight: 64,

      borderRadius: 16,

      backgroundColor:
        "#F2F6F4",

      paddingHorizontal: 14,
      paddingVertical: 12,

      flexDirection: "row",
      alignItems: "center",

      gap: 10,
    },

    anonymousIcon: {
      width: 32,
      height: 32,

      borderRadius: 16,

      backgroundColor:
        "#E8F3EF",

      alignItems: "center",
      justifyContent:
        "center",
    },

    anonymousTitle: {
      color: "#30302E",

      fontSize: 11,
      fontWeight: "800",
    },

    anonymousText: {
      marginTop: 2,

      color:
        "rgba(48,48,46,0.52)",

      fontSize: 9,
    },

    feedbackError: {
      color: "#B42318",

      fontSize: 13,
      lineHeight: 18,

      textAlign: "center",
    },

    /*
     * Submit feedback
     */
    feedbackSubmitBtn: {
      minHeight: 56,

      borderRadius: 999,

      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",

      gap: 10,

      backgroundColor:
        "#5C9F88",

      paddingHorizontal: 20,
    },

    feedbackButtonDisabled: {
      opacity: 0.55,
    },

    feedbackSubmitText: {
      color: "#FFFFFF",

      fontSize: 15,
      fontWeight: "900",
    },

    deleteFeedbackBtn: {
      minHeight: 44,

      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",

      gap: 7,
    },

    deleteFeedbackText: {
      color: "#A55B69",

      fontSize: 13,
      fontWeight: "800",
    },

    /*
     * Preview statistics inside modal
     */
    feedbackPreview: {
      marginTop: 4,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 22,

      padding: 16,
    },

    feedbackPreviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      marginBottom: 16,
    },

    feedbackPreviewTitle: {
      color: "#20201E",

      fontSize: 15,
      fontWeight: "900",
    },

    feedbackPreviewCount: {
      color:
        "rgba(32,32,30,0.52)",

      fontSize: 11,
    },

    /*
     * General states
     */
    center: {
      flex: 1,

      alignItems: "center",
      justifyContent:
        "center",

      padding: 16,

      backgroundColor:
        "#FBF8F4",
    },

    muted: {
      marginTop: 10,

      color:
        "rgba(63,59,55,0.6)",
    },

    errorTitle: {
      fontSize: 18,
      fontWeight: "900",

      color: "#B42318",

      marginBottom: 6,
    },

    btn: {
      marginTop: 16,

      backgroundColor:
        "rgba(0,0,0,0.08)",

      paddingHorizontal: 14,
      paddingVertical: 10,

      borderRadius: 14,
    },

    btnText: {
      fontWeight: "800",
      color: "#3F3B37",
    },

    /*
     * Product not found
     */
    notFoundPage: {
      flex: 1,

      backgroundColor:
        "#F7F1EA",

      paddingHorizontal: 22,
      paddingTop: 70,

      alignItems: "center",
    },

    notFoundTitle: {
      fontSize: 34,
      fontWeight: "900",

      color: "#4E4E4E",

      textAlign: "center",
    },

    notFoundSub: {
      marginTop: 14,

      fontSize: 18,
      lineHeight: 26,

      color:
        "rgba(63,59,55,0.70)",

      textAlign: "center",
    },

    notFoundArt: {
      marginTop: 26,
      marginBottom: 18,

      alignItems: "center",
      justifyContent:
        "center",
    },

    notFoundHint: {
      marginTop: 8,

      fontSize: 18,
      lineHeight: 26,

      color:
        "rgba(63,59,55,0.70)",

      textAlign: "center",
    },

    addProductBtn: {
      marginTop: 22,

      minHeight: 54,

      borderRadius: 16,

      paddingHorizontal: 24,

      alignItems: "center",
      justifyContent:
        "center",

      backgroundColor:
        "#3F3B37",
    },

    addProductBtnText: {
      color: "#FFFFFF",

      fontSize: 16,
      fontWeight: "900",
    },

    backBtn: {
      marginTop: 12,

      height: 50,

      borderRadius: 14,

      paddingHorizontal: 22,

      alignItems: "center",
      justifyContent:
        "center",

      backgroundColor:
        "#FFFFFF",

      shadowColor: "#000",

      shadowOpacity: 0.12,

      shadowRadius: 12,

      shadowOffset: {
        width: 0,
        height: 8,
      },

      elevation: 3,
    },

    backBtnText: {
      fontSize: 16,
      fontWeight: "800",

      color: "#3F3B37",
    },
  });
