import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Keyboard,
  Pressable,
  ImageBackground,
  Dimensions,
  ColorValue,
  Animated,
  Easing,
} from "react-native";
import {
  CategoriesGrid,
  HomeCategory,
} from "../../../components/CategoriesGrid";
import CameraIcon from "../../../../assets/icons/camera.svg";
import { Image } from "expo-image";
import { Camera } from "expo-camera";
import { CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Carousel from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";
import { useProductByEan, useProductsByFlag } from "../../../hooks/useProduct";
import { FlagRow } from "../../../components/flagRow";
import { useAuth } from "../../../components/AuthProvider";
import StoryVideoModal from "../../../components/StoryVideoModal";
import { Ionicons } from "@expo/vector-icons";
import { useBanners } from "../../../hooks/useBanner";
import { Banner } from "../../../types/product";
import RenderHtml from "@native-html/render";

type Story = { id: string; name: string; avatar: string };
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const { width } = Dimensions.get("window");

const STORIES: Story[] = [
  { id: "s1", name: "Sophie", avatar: "https://i.pravatar.cc/80?img=32" },
  { id: "s2", name: "Maman", avatar: "https://i.pravatar.cc/80?img=48" },
  { id: "s3", name: "Sport", avatar: "https://i.pravatar.cc/80?img=12" },
  { id: "s4", name: "Marie", avatar: "https://i.pravatar.cc/80?img=5" },
  { id: "s5", name: "Marie", avatar: "https://i.pravatar.cc/80?img=53" },
];

const SCAN_BOX_WIDTH = SCREEN_WIDTH * 0.78;
const SCAN_BOX_HEIGHT = 220;
const STORY_URL =
  "https://res.cloudinary.com/dozuv3fd2/video/upload/v1769108403/Et_si_ton_stress_impactait_aussi_ta_bouche_Comme_nous_l_explique_dr_sacha_gabriel_le_stress_i6uptq.mp4";

const CATEGORY_ROWS = [{ id: 1 }] as const;
const HOME_CATEGORIES: HomeCategory[] = [
  {
    id: "13",
    title: "Peau",
    icon: require("../../../../assets/img/skin.png"),
    gradient: ["#F8DAD5", "#FDF3EE"],
    ring: "#D8B8B2",
  },
  {
    id: "4",
    title: "Cheveux",
    icon: require("../../../../assets/img/hair.png"),
    gradient: ["#D6F1E7", "#EEF9F4"],
    ring: "#A8CFC2",
  },
  // { id: "preg", title: "Grossesse/\nAllaitement", icon: "https://img.icons8.com/ios-filled/100/like.png", bg: "#E4F2FB" },
  // { id: "scalp", title: "Cuir\nchevelu", icon: "https://img.icons8.com/ios-filled/100/virus.png", bg: "#F7F0E3" },
  // { id: "nails", title: "Ongles /\nLèvres", icon: "https://img.icons8.com/ios-filled/100/hand.png", bg: "#F3E3DE" },
  // { id: "oil", title: "Huiles de\nmassage", icon: "https://img.icons8.com/ios-filled/100/mortar.png", bg: "#DFF1EA" },
  // { id: "fem", title: "Hygiène\nféminine", icon: "https://img.icons8.com/ios-filled/100/woman.png", bg: "#E4F2FB" },
  // { id: "acne", title: "Acné après\nrasage", icon: "https://img.icons8.com/ios-filled/100/happy.png", bg: "#F7F0E3" },
];
export default function HomeScreen() {
  const { token, user } = useAuth();
  const [ean, setEan] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [scanned, setScanned] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const progress = useSharedValue<number>(0);
  const carouselWidth = SCREEN_WIDTH - 32;
  const { data: bannersData = [] } = useBanners();
  const banners = Array.isArray(bannersData) ? bannersData : [];

  const renderBannerCard = ({ item }: { item: Banner }) => {
    const bannerImageSource = item.image
      ? { uri: item.image }
      : require("../../../../assets/img/winter.png");
    return (
      <Pressable
        style={styles.bannerSlide}
        onPress={() =>
          router.push({
            pathname: "/banner/[id]",
            params: { id: String(item.id) },
          })
        }
      >
        <View style={styles.bannerBackground}>
          <Image
            source={bannerImageSource}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />

          <LinearGradient
            colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0.45)"]}
            style={styles.bannerOverlay}
          >
            {/* <Text style={styles.bannerTitle}>{item.title}</Text> */}
            <RenderHtml
              contentWidth={width -32}
              source={{ html: item.shortDescription || "" }}
              baseStyle={{
                color: "#FFFFFF",
                textAlign: "center",
              }}
              tagsStyles={{
                p: {
                  color: "#FFFFFF",
                  textAlign: "center",
                  fontSize: 14,
                  lineHeight: 20,
                  margin: 0,
                },
                h1: {
                  color: "#FFFFFF",
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: "800",
                  margin: 0,
                },
                h2: {
                  color: "#FFFFFF",
                  textAlign: "center",
                  fontSize: 16,
                  fontWeight: "800",
                  margin: 0,
                },
                strong: {
                  color: "#FFFFFF",
                  fontWeight: "800",
                },
              }}
            />
          </LinearGradient>
        </View>
      </Pressable>
    );
  };
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const meName = user?.fullName?.split(" ")[0] || "User";
  const meAvatar =
    user?.avatarUrl && user.avatarUrl.trim().length > 0
      ? { uri: user.avatarUrl }
      : require("../../../../assets/img/avatar.png");

  const {
    data: searchedProduct,
    isFetching: isSearching,
    error: searchError,
    refetch: refetchProduct,
  } = useProductByEan(ean, { enabled: false });
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyUrl, setStoryUrl] = useState<string | null>(null);

  const openStory = (url: string) => {
    setStoryUrl(url);
    setStoryOpen(true);
  };
  // Permission + reset scan state
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

  const openProductDetail = (eanCode: string) => {
    router.push({ pathname: "/product/[ean]", params: { ean: eanCode } });
  };

  const handleSearch = () => {
    const trimmed = ean.trim();
    if (!trimmed) return;

    Keyboard.dismiss();
    inputRef.current?.blur();

    router.push({
      pathname: "/product/[ean]",
      params: { ean: trimmed },
    });
  };

  const handleRemoveResult = () => {
    setShowResult(false);
    setEan("");
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setShowScanner(false);

    const code = String(data || "").trim();
    if (!code) return;

    Keyboard.dismiss();
    inputRef.current?.blur();

    // Direct navigation to product detail
    router.push({
      pathname: "/product/[ean]",
      params: { ean: code },
    });
  };

  // Camera model

  const scanLineAnim = useRef(new Animated.Value(0)).current;

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

    return () => {
      loop.stop();
    };
  }, [showScanner, scanLineAnim]);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Stories */}
      <View style={styles.storiesHeader}>
        {/* PROFILE (NOT scrollable) */}
        {!!token && (
          <>
            <Pressable
              style={styles.story}
              onPress={() => {
                /* open profile */
              }}
            >
              <View style={styles.storyRingNeutral}>
                <Image
                  source={meAvatar}
                  style={styles.storyAvatar}
                  contentFit="cover"
                />
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {meName}
              </Text>
            </Pressable>

            <View style={styles.storyDivider} />
          </>
        )}

        {/* STORIES (scrollable) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesRow}
        >
          {STORIES.map((s) => (
            <Pressable
              key={s.id}
              style={styles.story}
              onPress={() => openStory(STORY_URL)}
            >
              <View style={styles.storyRing}>
                <Image
                  source={{ uri: s.avatar }}
                  style={styles.storyAvatar}
                  contentFit="cover"
                />
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <StoryVideoModal
        visible={storyOpen}
        url={storyUrl || STORY_URL}
        onClose={() => setStoryOpen(false)}
      />
      {/* rest of your page... */}
      {/* Advice banner (static) */}
      {banners.length > 0 && (
        <View style={styles.bannerOuter}>
          <Carousel
            width={carouselWidth}
            height={210}
            data={banners}
            loop
            autoPlay
            autoPlayInterval={3500}
            pagingEnabled
            snapEnabled
            mode="parallax"
            modeConfig={{
              parallaxScrollingScale: 0.92,
              parallaxScrollingOffset: 42,
            }}
            style={styles.carousel}
            renderItem={renderBannerCard}
          />

          <View style={styles.pagination}>
            {banners.map((_, index) => (
              <View key={index} style={styles.dot} />
            ))}
          </View>
        </View>
      )}

      {/* Manual input */}
      <View style={styles.searchCard}>
        {scanMode === "camera" ? (
          <>
            <Text style={styles.sectionTitle}>Scanner un produit</Text>
            {/* <Text style={styles.muted}>Obtenez une analyse instantanée des ingrédients</Text> */}

            <View style={styles.scanRow}>
              <Pressable
                style={styles.scanBtn}
                onPress={() => setShowScanner(true)}
              >
                <Text style={styles.scanBtnText}>Scanner maintenant</Text>
              </Pressable>

              <Pressable
                style={styles.camIconBtn}
                onPress={() => setShowScanner(true)}
              >
                <CameraIcon width={22} height={22} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => setScanMode("manual")}
              style={styles.scanLink}
            >
              <Text style={styles.scanLinkText}>
                Saisir le code manuellement
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Saisir le code manuellement</Text>
            <Text style={styles.muted}>Saisissez le code-barres (EAN)</Text>

            <View style={styles.searchRow}>
              <TextInput
                ref={inputRef}
                value={ean}
                onChangeText={setEan}
                placeholder="3264680010535"
                keyboardType="numeric"
                style={styles.input}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <Pressable
                style={styles.searchBtn}
                onPress={handleSearch}
                disabled={!ean || isSearching}
              >
                <Text style={styles.searchBtnText}>
                  {isSearching ? "..." : "OK"}
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
              <Text style={styles.scanLinkText}>
                Revenir au scan par caméra
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Scanner modal */}
      <Modal visible={showScanner} animationType="slide" transparent>
        <View style={styles.scannerRoot}>
          {hasCameraPermission === null ? (
            <View style={styles.permissionCenter}>
              <Text style={styles.permissionText}>
                Demande de permission à la caméra...
              </Text>
            </View>
          ) : hasCameraPermission === false ? (
            <View style={styles.permissionCenter}>
              <Text style={styles.permissionDenied}>Permission refusée</Text>

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

              {/* dark overlay */}
              <View style={styles.scannerOverlay}>
                {/* top bar */}
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
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={34} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* scan area */}
                <View style={styles.scanAreaWrapper}>
                  <View style={styles.scanBox}>
                    {/* corners */}
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />

                    {/* animated scan line */}
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

                {/* bottom manual text */}
                <View style={styles.manualEntryWrap}>
                  <Text style={styles.manualEntryText}>
                    Souhaitez-vous entrer le code manuellement ?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowScanner(false);
                      router.push("/manual-search");
                    }}
                  >
                    <Text style={styles.manualEntryLink}>Cliquez ici</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Search result preview card */}
      {searchError ? (
        <Text style={styles.errorText}>
          {(searchError as Error).message || "Produit non trouvé"}
        </Text>
      ) : null}

      {searchedProduct && showResult ? (
        <View style={styles.resultWrap}>
          <Pressable onPress={handleRemoveResult} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>

          <Pressable
            onPress={() => openProductDetail(searchedProduct.ean)}
            style={styles.resultCard}
          >
            <View style={styles.resultRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle} numberOfLines={2}>
                  {searchedProduct.name}
                </Text>
                <Text style={styles.resultSub}>
                  {searchedProduct.brand?.name}
                </Text>
                <Text style={styles.resultMeta}>
                  {searchedProduct.validScore}/20 • EAN {searchedProduct.ean}
                </Text>
              </View>

              {searchedProduct.images?.[0]?.thumbnail ||
              searchedProduct.images?.[0]?.image ? (
                <Image
                  source={{
                    uri:
                      searchedProduct.images?.[0]?.thumbnail ||
                      searchedProduct.images?.[0]?.image,
                  }}
                  style={styles.resultThumb}
                  contentFit="cover"
                />
              ) : null}
            </View>
          </Pressable>
        </View>
      ) : null}

      {/* Best products sections by category */}
      <View style={styles.blockHeader}>
        <Text style={styles.blockTitle}>Meilleurs produits</Text>
        <Pressable onPress={() => router.push({ pathname: "/(main)/explore" })}>
          <Text style={styles.blockLink}>Voir Plus</Text>
        </Pressable>
      </View>

      {CATEGORY_ROWS.map((c) => (
        <FlagRow key={c.id} flagId={c.id} onOpen={openProductDetail} />
      ))}
      <CategoriesGrid
        items={HOME_CATEGORIES}
        onPress={(cat) =>
          router.push({
            pathname: "/(main)/category/[id]",
            params: { id: cat.id },
          })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4" },
  content: { padding: 16, paddingBottom: 24, gap: 14 },
  storiesHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 34, // keep your status bar spacing
    paddingVertical: 4,
  },
  scannerRoot: {
    flex: 1,
    backgroundColor: "#000",
  },

  permissionCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#06153A",
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
    backgroundColor: "#ffffff22",
  },

  closePermissionText: {
    color: "#fff",
    fontWeight: "700",
  },

  scannerOverlay: {
    flex: 1,
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

  manualEntryWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: 12,
  },

  manualEntryText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    textAlign: "center",
  },

  manualEntryLink: {
    color: "#20D38A",
    fontSize: 15,
    fontWeight: "700",
  },
  // IMPORTANT: remove paddingHorizontal here to remove left/right space
  storiesRow: {
    gap: 5,
    paddingRight: 0, // no extra right space
  },

  story: {
    width: 70,
    alignItems: "center",
    gap: 8,
  },

  storyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  storyName: {
    fontSize: 12,
    color: "rgba(63,59,55,0.65)",
    fontWeight: "600",
  },

  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(191, 216, 216, 0.9)",
    backgroundColor: "#fff",
  },

  storyRingNeutral: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(190,190,190,0.55)",
    backgroundColor: "#fff",
  },

  storyDivider: {
    width: 1,
    height: 70,
    backgroundColor: "rgba(0,0,0,0.12)",
    marginHorizontal: 6,
  },
  bannerOuter: {
    marginHorizontal: 16,
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
    backgroundColor: "#ddd",
  },

  bannerImage: {
    borderRadius: 22,
  },

  bannerOverlay: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: "center",
  },

  bannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",

    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  bannerSub: {
    marginTop: 4,
    fontSize: 13,
    color: "#F4F4F5",
    textAlign: "center",

    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  bannerItemsWrapper: {
    marginTop: 12,
    gap: 6,
  },

  bannerItem: {
    fontSize: 13,
    color: "#F4F4F5",
    lineHeight: 18,

    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pagination: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#D4D4D8",
  },
  searchCard: {
    backgroundColor: "#DFF1EA",
    borderRadius: 15,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#3F3B37" },
  muted: { color: "rgba(63,59,55,0.6)" },

  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchBtn: {
    width: 52,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: { fontWeight: "900", color: "#3F3B37" },
  scanLink: { alignItems: "center", paddingTop: 6 },
  scanLinkText: { color: "rgba(63,59,55,0.7)", alignSelf: "flex-end" },

  modalWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  camera: { width: 320, height: 380, borderRadius: 18, overflow: "hidden" },

  resultWrap: { position: "relative" },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  closeBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 18,
  },

  resultCard: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    padding: 14,
  },
  resultRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  resultTitle: { fontSize: 16, fontWeight: "900", color: "#3F3B37" },
  resultSub: { marginTop: 4, color: "rgba(63,59,55,0.6)" },
  resultMeta: { marginTop: 6, color: "rgba(63,59,55,0.6)" },
  resultThumb: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  blockTitle: { fontSize: 20, fontWeight: "900", color: "#3F3B37" },
  blockLink: { color: "rgba(63,59,55,0.55)", fontWeight: "700" },

  catTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#3F3B37",
    marginBottom: 8,
    marginLeft: 2,
  },
  miniCard: {
    width: 160,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    padding: 12,
    marginRight: 12,
  },
  miniImg: { width: "100%", height: 92, borderRadius: 14, marginBottom: 10 },
  noImg: {
    width: "100%",
    height: 92,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  miniTitle: { fontWeight: "800", color: "#3F3B37", fontSize: 13 },
  miniScore: { marginTop: 6, color: "rgba(63,59,55,0.6)", fontWeight: "700" },

  errorText: { color: "#B42318", fontWeight: "800", marginTop: 8 },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
  },

  scanBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },

  scanBtnText: {
    fontWeight: "900",
    color: "#3F3B37",
  },

  camIconBtn: {
    width: 54,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },

  camIconText: {
    fontSize: 18,
  },

  scanLinkBold: {
    fontWeight: "900",
    color: "rgba(63,59,55,0.85)",
  },
});
