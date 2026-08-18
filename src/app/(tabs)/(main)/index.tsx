import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import RenderHtml from "@native-html/render";
import Carousel from "react-native-reanimated-carousel";

import CameraIcon from "../../../../assets/icons/camera.svg";
import HeartRedIcon from "../../../../assets/icons/heart-red.svg";
import {
  CategoriesGrid,
  HomeCategory,
} from "../../../components/CategoriesGrid";
import { useAuth } from "../../../components/AuthProvider";
import { useBanners } from "../../../hooks/useBanner";
import { useFavorites } from "../../../hooks/useFavorites";
import { useGroup } from "../../../hooks/useGroup";
import { useProductByEan } from "../../../hooks/useProduct";
import type { Banner } from "../../../types/product";
import type { FavoriteProduct } from "../../../types/user";
import ScanHistoryCard from "../../../components/ScanHistoryCard";
import { useMyScans, useMyScanStats } from "../../../hooks/useScans";
import { recordBannerDetailOpenAndMaybeShowAd } from "../../../services/ads/ad-session";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SCAN_BOX_WIDTH = SCREEN_WIDTH * 0.78;
const SCAN_BOX_HEIGHT = 220;

/*
 * Replace these values with the official BeautySafe contact information.
 */
const SUPPORT_EMAIL = "VOTRE_EMAIL@EXEMPLE.COM";
const INSTAGRAM_URL = "https://www.instagram.com/VOTRE_COMPTE";
const WHATSAPP_URL = "https://wa.me/VOTRE_NUMERO";

type QuickLinkItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
};

function getGreeting() {
  const currentHour = new Date().getHours();

  return currentHour >= 18 || currentHour < 5
    ? "Bonsoir"
    : "Bonjour";
}

function getProductImage(product: FavoriteProduct) {
  return (
    product.images?.[0]?.thumbnail ||
    product.images?.[0]?.image
  );
}

function getProductKey(
  product: FavoriteProduct,
  index: number,
) {
  return String(product.uid ?? product.ean ?? index);
}

export default function HomeScreen() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [ean, setEan] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] =
    useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const [scanMode, setScanMode] = useState<
    "camera" | "manual"
  >("camera");
  const [activeBannerIndex, setActiveBannerIndex] =
    useState(0);

  const inputRef = useRef<TextInput>(null);
  const bannerNavigationPendingRef = useRef(false);
  const bannerNavigationGuardTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const scanLineAnim = useRef(
    new Animated.Value(0),
  ).current;

  const carouselWidth = SCREEN_WIDTH - 32;
  const greeting = getGreeting();

  const meName =
    user?.fullName?.trim().split(/\s+/)[0] || "";

  const meAvatar =
    user?.avatarUrl &&
    user.avatarUrl.trim().length > 0
      ? { uri: user.avatarUrl }
      : require("../../../../assets/img/avatar.png");

  const { data: bannersData = [] } = useBanners();

 const banners = useMemo(
  () =>
    Array.isArray(bannersData)
      ? bannersData.filter(
          (banner) => banner.published === true,
        )
      : [],
  [bannersData],
);

  const paginationDotCount = Math.min(
    banners.length,
    3,
  );
  const activePaginationDot =
    banners.length <= 3
      ? activeBannerIndex
      : Math.round(
          (activeBannerIndex /
            Math.max(banners.length - 1, 1)) *
            (paginationDotCount - 1),
        );

  const {
    groups,
    isLoading: groupsLoading,
    isError: groupsError,
  } = useGroup();

  const categories = useMemo<HomeCategory[]>(
    () =>
      groups.map((group) => ({
        id: String(group.id),
        name: group.name,
        title: group.title,
        description: group.description,
        imageUrl: group.imageUrl,
      })),
    [groups],
  );

  const {
    favorites,
    isLoading: favoritesLoading,
    isError: favoritesError,
  } = useFavorites(Boolean(token));

  const favoriteProducts =
    (favorites ?? []) as FavoriteProduct[];

  const canLoadScanHistory = Boolean(token && user);
  const {
    data: scansPreview,
    isLoading: scansLoading,
    isError: scansError,
  } = useMyScans(1, 6, canLoadScanHistory);
  const { data: scanStats } = useMyScanStats(canLoadScanHistory);

  const {
    data: searchedProduct,
    isFetching: isSearching,
    error: searchError,
  } = useProductByEan(ean, {
    enabled: false,
  });

  const openExternalUrl = async (url: string) => {
    try {
      const supported =
        await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.warn("Unable to open URL", error);
    }
  };

  const openProductDetail = (
    eanCode?: string,
    fromEanSearch = false,
    source?: "scan",
  ) => {
    if (!eanCode) {
      return;
    }

    router.push({
      pathname: "/(tabs)/(main)/product/[ean]",
      params: {
        ean: eanCode,
        returnTo: "/(tabs)/(main)",
        ...(fromEanSearch ? { fromEanSearch: "true" } : {}),
        ...(source
          ? {
              source,
              scanNavigationId: `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,
            }
          : {}),
      },
    });
  };

  const quickLinks: QuickLinkItem[] = [
    {
      id: "privacy-policy",
      title: "Politique de confidentialité",
      subtitle:
        "Consultez la manière dont BeautySafe protège vos données.",
      icon: "shield-checkmark-outline",
      onPress: () =>
        router.push(
          "/(tabs)/(main)/privacy-policy",
        ),
    },
    {
      id: "idea",
      title: "Une idée à nous partager ?",
      subtitle: "Toute idée est bonne à prendre",
      icon: "bulb-outline",
      onPress: () =>
        openExternalUrl(
          `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
            "Une idée pour BeautySafe",
          )}`,
        ),
    },
    {
      id: "instagram",
      title: "Suivez-nous sur Instagram",
      subtitle:
        "Suivez l’aventure au quotidien !",
      icon: "logo-instagram",
      onPress: () =>
        openExternalUrl(INSTAGRAM_URL),
    },
    {
      id: "whatsapp",
      title: "Rejoignez-nous sur WhatsApp",
      subtitle:
        "Au plus près de la communauté",
      icon: "logo-whatsapp",
      onPress: () =>
        openExternalUrl(WHATSAPP_URL),
    },
  ];

  useEffect(() => {
    return () => {
      if (bannerNavigationGuardTimerRef.current) {
        clearTimeout(bannerNavigationGuardTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showScanner) {
      return;
    }

    setScanned(false);

    if (hasCameraPermission === null) {
      void (async () => {
        const { status } =
          await Camera.requestCameraPermissionsAsync();

        setHasCameraPermission(
          status === "granted",
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

    scanLineAnim.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1800,
          easing:
            Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1800,
          easing:
            Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => loop.stop();
  }, [
    showScanner,
    scanLineAnim,
  ]);

  const handleSearch = () => {
    const trimmed = ean.trim();

    if (!trimmed) {
      return;
    }

    Keyboard.dismiss();
    inputRef.current?.blur();
    setShowResult(true);

    openProductDetail(trimmed, true);
  };

  const handleRemoveResult = () => {
    setShowResult(false);
    setEan("");
  };

  const handleBarCodeScanned = ({
    data,
  }: {
    data: string;
  }) => {
    if (scanned) {
      return;
    }

    setScanned(true);
    setShowScanner(false);

    const code = String(
      data || "",
    ).trim();

    if (!code) {
      return;
    }

    Keyboard.dismiss();
    inputRef.current?.blur();

    openProductDetail(code, true, "scan");
  };

  const handleBannerPress = async (banner: Banner) => {
    if (bannerNavigationPendingRef.current) {
      if (__DEV__) {
        console.info("[Ads] duplicate banner press ignored");
      }

      return;
    }

    bannerNavigationPendingRef.current = true;

    try {
      await recordBannerDetailOpenAndMaybeShowAd();
    } catch (error) {
      if (__DEV__) {
        console.warn(
          "[Ads] banner detail ad checkpoint failed; continuing navigation",
          error,
        );
      }
    }

    try {
      router.push({
        pathname: "/banner/[id]",
        params: { id: String(banner.id) },
      });
    } finally {
      if (bannerNavigationGuardTimerRef.current) {
        clearTimeout(bannerNavigationGuardTimerRef.current);
      }

      bannerNavigationGuardTimerRef.current = setTimeout(() => {
        bannerNavigationPendingRef.current = false;
        bannerNavigationGuardTimerRef.current = null;
      }, 750);
    }
  };

const renderBannerCard = ({ item }: { item: Banner }) => {
  const bannerImageSource = item.image
    ? { uri: item.image }
    : require("../../../../assets/img/winter.png");

  return (
    <Pressable
      style={styles.bannerSlide}
      onPress={() => void handleBannerPress(item)}
    >
      <View style={styles.bannerBackground}>
        <Image
          source={bannerImageSource}
          style={styles.bannerImage}
          contentFit="contain"
          contentPosition="center"
          transition={200}
        />
      </View>
    </Pressable>
  );
};

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
     {token && user ? (
    <Pressable
      style={styles.profileHeader}
      onPress={() => router.push("/(main)/profile")}
    >
      <Image
        source={meAvatar}
        style={styles.profileAvatar}
        contentFit="cover"
      />

      <View style={styles.profileTextWrap}>
        <Text style={styles.greetingText}>
          {greeting}
          {meName ? `, ${meName}` : ""}
        </Text>

        <Text style={styles.greetingSubtitle}>
          Prenez soin de vous aujourd’hui
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={22}
        color="#69716F"
      />
    </Pressable>
  ) : (
    <View style={styles.profileHeader}>
      <View style={styles.profileTextWrap}>
        <Text style={styles.greetingText}>
          {greeting}
        </Text>

        <Text style={styles.greetingSubtitle}>
          Prenez soin de vous aujourd’hui
        </Text>
      </View>
    </View>
  )}

{banners.length > 0 ? (
  <View style={styles.bannerOuter}>
    <Carousel
      width={carouselWidth}
      height={210}
      data={banners}
      loop={banners.length > 1}
      autoPlay={banners.length > 1}
      autoPlayInterval={3500}
      pagingEnabled
      snapEnabled
      mode="parallax"
      modeConfig={{
        parallaxScrollingScale: 0.96,
        parallaxScrollingOffset: 28,
      }}
      style={styles.carousel}
      renderItem={renderBannerCard}
      onSnapToItem={setActiveBannerIndex}
    />

    {banners.length > 1 ? (
      <View style={styles.pagination}>
        {Array.from({
          length: paginationDotCount,
        }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activePaginationDot && styles.dotActive,
            ]}
          />
        ))}
      </View>
    ) : null}
  </View>
) : null}

      {token ? (
        <View
          style={
            styles.favoriteSection
          }
        >
          <View
            style={styles.blockHeader}
          >
            <View>
              <Text
                style={
                  styles.blockTitle
                }
              >
                Mes favoris
              </Text>

              {/* <Text
                style={
                  styles.blockSubtitle
                }
              >
                Retrouvez rapidement les
                produits que vous aimez
              </Text> */}
            </View>

            <Pressable
              onPress={() =>
                router.push(
                  "/(main)/favori",
                )
              }
            >
              <Text
                style={
                  styles.blockLink
                }
              >
                Voir tout
              </Text>
            </Pressable>
          </View>

          {favoritesLoading ? (
            <View
              style={
                styles.favoriteStateCard
              }
            >
              <ActivityIndicator
                color="#3F3B37"
              />

              <Text
                style={
                  styles.favoriteStateText
                }
              >
                Chargement de vos favoris...
              </Text>
            </View>
          ) : favoritesError ? (
            <View
              style={
                styles.favoriteStateCard
              }
            >
              <Text
                style={
                  styles.errorText
                }
              >
                Impossible de charger vos
                favoris.
              </Text>
            </View>
          ) : favoriteProducts.length >
            0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.favoriteList
              }
            >
              {favoriteProducts
                .slice(0, 10)
                .map(
                  (
                    product,
                    index,
                  ) => {
                    const productImage =
                      getProductImage(
                        product,
                      );

                    return (
                      <Pressable
                        key={getProductKey(
                          product,
                          index,
                        )}
                        style={
                          styles.favoriteCard
                        }
                        onPress={() =>
                          openProductDetail(
                            product.ean,
                          )
                        }
                      >
                        <View
                          style={
                            styles.favoriteImageWrap
                          }
                        >
                          {productImage ? (
                            <Image
                              source={{
                                uri: productImage,
                              }}
                              style={
                                styles.favoriteImage
                              }
                              contentFit="contain"
                            />
                          ) : (
                            <View
                              style={
                                styles.favoriteImageFallback
                              }
                            >
                              <Ionicons
                                name="image-outline"
                                size={30}
                                color="#9C9A96"
                              />
                            </View>
                          )}

                          <View
                            style={
                              styles.favoriteHeartBadge
                            }
                          >
                            <HeartRedIcon
                              width={17}
                              height={17}
                            />
                          </View>
                        </View>

                        <Text
                          style={
                            styles.favoriteBrand
                          }
                          numberOfLines={1}
                        >
                          {product.brand
                            ?.name ||
                            "BeautySafe"}
                        </Text>

                        <Text
                          style={
                            styles.favoriteName
                          }
                          numberOfLines={2}
                        >
                          {product.name ||
                            "Produit"}
                        </Text>

                        {/* <View
                          style={
                            styles.favoriteScoreRow
                          }
                        >
                          <Ionicons
                            name="star"
                            size={14}
                            color="#D39A37"
                          />

                          <Text
                            style={
                              styles.favoriteScoreText
                            }
                          >
                            {typeof product.validScore ===
                            "number"
                              ? `${product.validScore}/20`
                              : "Score indisponible"}
                          </Text>
                        </View> */}
                      </Pressable>
                    );
                  },
                )}
            </ScrollView>
          ) : (
            <Pressable
              style={
                styles.favoriteEmptyCard
              }
              onPress={() =>
                router.push(
                  "/(main)/explore",
                )
              }
            >
              <View
                style={
                  styles.favoriteEmptyIcon
                }
              >
                <Ionicons
                  name="heart-outline"
                  size={24}
                  color="#A55B69"
                />
              </View>

              <View
                style={
                  styles.favoriteEmptyTextWrap
                }
              >
                <Text
                  style={
                    styles.favoriteEmptyTitle
                  }
                >
                  Aucun produit favori pour
                  le moment
                </Text>

                <Text
                  style={
                    styles.favoriteEmptySubtitle
                  }
                >
                  Explorez les produits et
                  ajoutez ceux que vous
                  aimez.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#69716F"
              />
            </Pressable>
          )}
        </View>
      ) : null}

      <View style={styles.searchCard}>
        {scanMode === "camera" ? (
          <>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Scanner un produit
            </Text>

            <Text
              style={styles.scanSubtitle}
            >
              Analysez un produit en scannant
              simplement son code-barres.
            </Text>

            <View
              style={styles.scanRow}
            >
              <Pressable
                style={styles.scanBtn}
                onPress={() =>
                  setShowScanner(true)
                }
              >
                <Text
                  style={
                    styles.scanBtnText
                  }
                >
                  Scanner maintenant
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.camIconBtn
                }
                onPress={() =>
                  setShowScanner(true)
                }
              >
                <CameraIcon
                  width={22}
                  height={22}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() =>
                setScanMode("manual")
              }
              style={styles.scanLink}
            >
              <Text
                style={
                  styles.scanLinkText
                }
              >
                Saisir le code
                manuellement
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Saisir le code manuellement
            </Text>

            <Text
              style={styles.muted}
            >
              Saisissez le code-barres
              (EAN)
            </Text>

            <View
              style={styles.searchRow}
            >
              <TextInput
                ref={inputRef}
                value={ean}
                onChangeText={setEan}
                placeholder="3264680010535"
                placeholderTextColor="rgba(63,59,55,0.4)"
                keyboardType="numeric"
                style={styles.input}
                onSubmitEditing={
                  handleSearch
                }
                returnKeyType="search"
              />

              <Pressable
                style={[
                  styles.searchBtn,
                  (!ean.trim() ||
                    isSearching) &&
                    styles.searchBtnDisabled,
                ]}
                onPress={handleSearch}
                disabled={
                  !ean.trim() ||
                  isSearching
                }
              >
                <Text
                  style={
                    styles.searchBtnText
                  }
                >
                  {isSearching
                    ? "..."
                    : "OK"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                setScanMode("camera");
              }}
              style={styles.scanLink}
            >
              <Text
                style={
                  styles.scanLinkText
                }
              >
                Revenir au scan par caméra
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <Modal
        visible={showScanner}
        animationType="slide"
        transparent
      >
        <View
          style={styles.scannerRoot}
        >
          {hasCameraPermission ===
          null ? (
            <View
              style={
                styles.permissionCenter
              }
            >
              <ActivityIndicator
                size="large"
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.permissionText
                }
              >
                Demande de permission à la
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

              <Text
                style={
                  styles.permissionHelp
                }
              >
                Autorisez l’accès à la caméra
                depuis les réglages de votre
                téléphone pour scanner un
                produit.
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowScanner(false)
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
                    style={
                      styles.scannerHeaderText
                    }
                  >
                    <Text
                      style={
                        styles.scannerTitle
                      }
                    >
                      Scanner le code-barres
                    </Text>

                    <Text
                      style={
                        styles.scannerSubtitle
                      }
                    >
                      Pointez votre appareil
                      photo vers un code-barres
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      setShowScanner(false)
                    }
                    style={
                      styles.scannerCloseBtn
                    }
                  >
                    <Ionicons
                      name="close"
                      size={32}
                      color="#FFFFFF"
                    />
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
                          transform: [
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
                                  },
                                ),
                            },
                          ],
                        },
                      ]}
                    />
                  </View>
                </View>

                <View
                  style={
                    styles.manualEntryWrap
                  }
                >
                  <Text
                    style={
                      styles.manualEntryText
                    }
                  >
                    Souhaitez-vous entrer le
                    code manuellement ?{" "}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setShowScanner(false);

                      router.push(
                        "/manual-search",
                      );
                    }}
                  >
                    <Text
                      style={
                        styles.manualEntryLink
                      }
                    >
                      Cliquez ici
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>

      {searchError ? (
        <Text
          style={styles.errorText}
        >
          {(searchError as Error)
            .message ||
            "Produit non trouvé"}
        </Text>
      ) : null}

      {searchedProduct &&
      showResult ? (
        <View
          style={styles.resultWrap}
        >
          <Pressable
            onPress={handleRemoveResult}
            style={
              styles.resultCloseBtn
            }
          >
            <Ionicons
              name="close"
              size={18}
              color="#3F3B37"
            />
          </Pressable>

          <Pressable
            onPress={() =>
              openProductDetail(
                searchedProduct.ean,
              )
            }
            style={styles.resultCard}
          >
            <View
              style={styles.resultRow}
            >
              <View
                style={
                  styles.resultTextWrap
                }
              >
                <Text
                  style={
                    styles.resultTitle
                  }
                  numberOfLines={2}
                >
                  {searchedProduct.name}
                </Text>

                <Text
                  style={
                    styles.resultSub
                  }
                >
                  {
                    searchedProduct.brand
                      ?.name
                  }
                </Text>

                <Text
                  style={
                    styles.resultMeta
                  }
                >
                   EAN{" "}
                  {searchedProduct.ean}
                </Text>
              </View>

              {searchedProduct.images?.[0]
                ?.thumbnail ||
              searchedProduct.images?.[0]
                ?.image ? (
                <Image
                  source={{
                    uri:
                      searchedProduct
                        .images?.[0]
                        ?.thumbnail ||
                      searchedProduct
                        .images?.[0]
                        ?.image,
                  }}
                  style={
                    styles.resultThumb
                  }
                  contentFit="contain"
                />
              ) : null}
            </View>
          </Pressable>
        </View>
      ) : null}


      {groupsLoading ? (
        <View
          style={
            styles.categoriesState
          }
        >
          <ActivityIndicator
            color="#3F3B37"
          />

          <Text
            style={styles.muted}
          >
            Chargement des catégories...
          </Text>
        </View>
      ) : groupsError ? (
        <View
          style={
            styles.categoriesState
          }
        >
          <Text
            style={styles.errorText}
          >
            Impossible de charger les
            catégories.
          </Text>
        </View>
      ) : categories.length > 0 ? (
        <CategoriesGrid
          items={categories}
          onPress={(category) =>
            router.push({
              pathname:
                "/(main)/category/[id]",
              params: {
                id: category.id,
              },
            })
          }
        />
      ) : (
        <View
          style={
            styles.categoriesState
          }
        >
          <Text
            style={styles.muted}
          >
            Aucune catégorie disponible.
          </Text>
        </View>
      )}

      {canLoadScanHistory ? (
        <View style={styles.scanHistorySection}>
          <View style={styles.blockHeader}>
            <View>
              <Text style={styles.blockTitle}>Historique des scans</Text>
              {/* <Text style={styles.blockSubtitle}>
                {scanStats
                  ? `${scanStats.totalScans} scans • ${scanStats.uniqueProducts} produits différents`
                  : `${scansPreview?.totalScans ?? 0} scans`}
              </Text> */}
            </View>

            <Pressable
              onPress={() => router.push("/(tabs)/(main)/scan-history")}
            >
              <Text style={styles.blockLink}>Voir tout</Text>
            </Pressable>
          </View>

          {scansLoading ? (
            <View style={styles.scanHistoryStateCard}>
              <ActivityIndicator color="#3F3B37" />
              <Text style={styles.scanHistoryStateText}>
                Chargement de vos scans...
              </Text>
            </View>
          ) : scansError ? (
            <View style={styles.scanHistoryStateCard}>
              <Text style={styles.errorText}>
                Impossible de charger votre historique.
              </Text>
            </View>
          ) : scansPreview?.items?.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scanHistoryList}
            >
              {scansPreview.items.map((scan) => (
                <ScanHistoryCard
                  key={scan.id}
                  scan={scan}
                  compact
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/(main)/product/[ean]",
                      params: {
                        ean: scan.product.ean,
                        returnTo: "/(tabs)/(main)",
                      },
                    })
                  }
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.scanHistoryStateCard}>
              <Ionicons name="scan-outline" size={24} color="#687C79" />
              <Text style={styles.scanHistoryStateText}>
                Vos prochains scans apparaîtront ici.
              </Text>
            </View>
          )}
        </View>
      ) : null}
      <View
        style={
          styles.communitySection
        }
      >
        <Pressable
          style={
            styles.communityCard
          }
          onPress={() =>
            router.push(
              "/(tabs)/(main)/faq",
            )
          }
        >
          <Image
            source={meAvatar}
            style={
              styles.communityAvatar
            }
            contentFit="cover"
          />

          <View
            style={
              styles.communityCardText
            }
          >
            <Text
              style={
                styles.communityCardTitle
              }
            >
              Vous avez des questions ?
            </Text>

            <Text
              style={
                styles.communityCardSubtitle
              }
            >
              Notre service client est là
              pour vous aider à tout moment.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#203A42"
          />
        </Pressable>

        <Pressable
          style={
            styles.communityCard
          }
          onPress={() =>
            router.push(
              "/(tabs)/(main)/contact",
            )
          }
        >
          <View
            style={
              styles.communityFeatureIcon
            }
          >
            <Ionicons
              name="mail-outline"
              size={28}
              color="#B06B52"
            />
          </View>

          <View
            style={
              styles.communityCardText
            }
          >
            <Text
              style={
                styles.communityCardTitle
              }
            >
              Contactez-nous
            </Text>

            <Text
              style={
                styles.communityCardSubtitle
              }
            >
              Notre équipe est à votre écoute
              pour répondre à vos questions.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#203A42"
          />
        </Pressable>

        <View
          style={
            styles.quickLinksWrap
          }
        >
          {quickLinks.map((item) => (
            <Pressable
              key={item.id}
              style={
                styles.quickLinkRow
              }
              onPress={item.onPress}
            >
              <View
                style={
                  styles.quickLinkIcon
                }
              >
                <Ionicons
                  name={item.icon}
                  size={21}
                  color="#203A42"
                />
              </View>

              <View
                style={
                  styles.quickLinkTextWrap
                }
              >
                <Text
                  style={
                    styles.quickLinkTitle
                  }
                >
                  {item.title}
                </Text>

                <Text
                  style={
                    styles.quickLinkSubtitle
                  }
                >
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#203A42"
              />
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FBF8F4",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 96,
    gap: 10,
  },

  profileHeader: {
    // minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    // gap: 12,
    // paddingHorizontal: 4,
  },

  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#EAE4DE",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  profileTextWrap: {
    flex: 1,
  },

  greetingText: {
    marginTop: 10,
    color: "#203A42",
    fontSize: 22,
    // lineHeight: 27,
    fontWeight: "900",
  },

  greetingSubtitle: {
    // marginTop: 4,
    color: "#7D8382",
    fontSize: 13,
    lineHeight: 18,
  },

 bannerOuter: {
  marginHorizontal: -2,
},

carousel: {
  width: SCREEN_WIDTH - 32,
  alignSelf: "center",
},

bannerSlide: {
  flex: 1,
  paddingHorizontal: 3,
},

bannerBackground: {
  flex: 1,
  borderRadius: 22,
  overflow: "hidden",

  // Important when using "contain"
  backgroundColor: "#FBF8F4",

  alignItems: "center",
  justifyContent: "center",
},

bannerImage: {
  width: "100%",
  height: "100%",
},

pagination: {
  marginTop: 9,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 6,
},

dot: {
  width: 7,
  height: 7,
  borderRadius: 999,
  backgroundColor: "#D3D0CC",
},

dotActive: {
  width: 18,
  backgroundColor: "#687C79",
},

  favoriteSection: {
    gap: 12,
  },

  scanHistorySection: {
    gap: 12,
  },

  scanHistoryList: {
    paddingRight: 4,
    gap: 12,
  },

  scanHistoryStateCard: {
    minHeight: 92,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  scanHistoryStateText: {
    color: "#69716F",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },

  blockHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  blockTitle: {
    color: "#203A42",
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
  },

  blockSubtitle: {
    marginTop: 3,
    maxWidth: SCREEN_WIDTH - 130,
    color: "#7D8382",
    fontSize: 12,
    lineHeight: 17,
  },

  blockLink: {
    color: "#687C79",
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 4,
  },

  favoriteList: {
    paddingRight: 4,
    gap: 12,
  },

  favoriteCard: {
    width: 158,
    minHeight: 224,
    padding: 11,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor:
      "rgba(32,58,66,0.07)",
  },

  favoriteImageWrap: {
    position: "relative",
    width: "100%",
    height: 118,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#F4F1ED",
  },

  favoriteImage: {
    width: "100%",
    height: "100%",
  },

  favoriteImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  favoriteHeartBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.94)",
  },

  favoriteBrand: {
    marginTop: 10,
    color: "#9A8580",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  favoriteName: {
    minHeight: 36,
    marginTop: 3,
    color: "#203A42",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },

  favoriteScoreRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  favoriteScoreText: {
    color: "#727978",
    fontSize: 12,
    fontWeight: "700",
  },

  favoriteStateCard: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  favoriteStateText: {
    color: "#69716F",
    fontSize: 13,
    fontWeight: "700",
  },

  favoriteEmptyCard: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  favoriteEmptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8E9EC",
  },

  favoriteEmptyTextWrap: {
    flex: 1,
  },

  favoriteEmptyTitle: {
    color: "#203A42",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },

  favoriteEmptySubtitle: {
    marginTop: 3,
    color: "#828786",
    fontSize: 12,
    lineHeight: 17,
  },

  searchCard: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    // gap: 12,
    borderRadius: 20,
    alignItems: "stretch",
    backgroundColor: "#DFF1EA",
  },

  sectionTitle: {
    color: "#3F3B37",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  scanSubtitle: {
    color: "rgba(63,59,55,0.66)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  muted: {
    color: "rgba(63,59,55,0.6)",
    textAlign: "center",
  },

  scanRow: {
    marginTop: 4,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  scanBtn: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.82)",
  },

  scanBtnText: {
    color: "#3F3B37",
    fontWeight: "900",
    textAlign: "center",
    flexShrink: 1,
  },

  camIconBtn: {
    width: 48,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.82)",
  },

  scanLink: {
    width: "100%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  scanLinkText: {
    color: "rgba(63,59,55,0.7)",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  searchRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  input: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 45,
    paddingHorizontal: 14,
    borderRadius: 14,
    color: "#3F3B37",
    backgroundColor:
      "rgba(255,255,255,0.82)",
  },

  searchBtn: {
    width: 54,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3F3B37",
  },

  searchBtnDisabled: {
    opacity: 0.45,
  },

  searchBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  scannerRoot: {
    flex: 1,
    backgroundColor: "#000000",
  },

  permissionCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#06153A",
  },

  permissionText: {
    marginTop: 14,
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
  },

  permissionDenied: {
    color: "#FF8A8A",
    fontSize: 19,
    fontWeight: "800",
  },

  permissionHelp: {
    marginTop: 10,
    color:
      "rgba(255,255,255,0.78)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  closePermissionBtn: {
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor:
      "rgba(255,255,255,0.14)",
  },

  closePermissionText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  scannerOverlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 22,
    paddingBottom: 42,
    backgroundColor:
      "rgba(0,0,0,0.45)",
  },

  scannerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  scannerHeaderText: {
    flex: 1,
  },

  scannerTitle: {
    marginRight: 12,
    color: "#FFFFFF",
    fontSize: 29,
    lineHeight: 36,
    fontWeight: "800",
  },

  scannerSubtitle: {
    marginTop: 6,
    color:
      "rgba(255,255,255,0.85)",
    fontSize: 16,
    lineHeight: 24,
  },

  scannerCloseBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  scanAreaWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  scanBox: {
    position: "relative",
    width: SCAN_BOX_WIDTH,
    height: SCAN_BOX_HEIGHT,
  },

  corner: {
    position: "absolute",
    zIndex: 2,
    width: 46,
    height: 46,
    borderColor: "#FFFFFF",
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
    right: 0,
    bottom: 0,
    borderRightWidth: 8,
    borderBottomWidth: 8,
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
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 4,
  },

  manualEntryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  manualEntryText: {
    color:
      "rgba(255,255,255,0.9)",
    fontSize: 15,
    textAlign: "center",
  },

  manualEntryLink: {
    color: "#20D38A",
    fontSize: 15,
    fontWeight: "700",
  },

  errorText: {
    color: "#B42318",
    fontWeight: "800",
    textAlign: "center",
  },

  resultWrap: {
    position: "relative",
  },

  resultCloseBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor:
      "rgba(32,58,66,0.08)",
  },

  resultCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor:
      "rgba(255,255,255,0.82)",
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  resultTextWrap: {
    flex: 1,
  },

  resultTitle: {
    color: "#3F3B37",
    fontSize: 16,
    fontWeight: "900",
  },

  resultSub: {
    marginTop: 4,
    color:
      "rgba(63,59,55,0.6)",
  },

  resultMeta: {
    marginTop: 6,
    color:
      "rgba(63,59,55,0.6)",
  },

  resultThumb: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor:
      "rgba(0,0,0,0.04)",
  },

  categoriesState: {
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    padding: 16,
    borderRadius: 18,
    backgroundColor:
      "rgba(255,255,255,0.76)",
  },

  communitySection: {
    marginTop: 6,
    gap: 11,
  },

  communityCard: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor:
      "rgba(32,58,66,0.05)",
  },

  communityAvatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#F0E4DC",
  },

  communityFeatureIcon: {
    width: 55,
    height: 55,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0E5",
  },

  communityCardText: {
    flex: 1,
  },

  communityCardTitle: {
    color: "#203A42",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },

  communityCardSubtitle: {
    marginTop: 4,
    color: "#858B8A",
    fontSize: 12,
    lineHeight: 17,
  },

  quickLinksWrap: {
    marginTop: 10,
    paddingHorizontal: 4,
  },

  quickLinkRow: {
    // minHeight: 65,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
  },

  quickLinkIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  quickLinkTextWrap: {
    flex: 1,
  },

  quickLinkTitle: {
    color: "#203A42",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },

  quickLinkSubtitle: {
    marginTop: 2,
    color: "#8A8F8E",
    fontSize: 12,
    lineHeight: 17,
  },
});
