import React, { useEffect, useMemo, useState, useRef } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Animated, Modal, TextInput, ScrollView} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import ArrowLeftIcon from  "../../../../assets/icons/arrow-left.svg"
import RefreshIcon from  "../../../../assets/icons/refresh.svg"
import FilterIcon from "../../../../assets/icons/filter.svg";
import subSubCategoriesJson from "../../../../assets/json/sub-subcategories.json";

import brandsJson from "../../../../assets/json/brands.json";
import ingredientsJson from "../../../../assets/json/ingredients.json";

import { useProductsSearchInfinite } from "../../../hooks/useProduct";
import BestProductBadge from "../../../../assets/best-product-badg.svg";

// NEW infinite hook
import { useProductsByFlagInfinite } from "../../../hooks/useProduct";

type Product = {
  ean: string;
  name: string;
  validScore?: number | null;
  brand?: { name?: string | null } | null;
  images?: { thumbnail?: string; image?: string }[];
};
const HAIR_SUB_FLAGS = [
  { id: 5, name: "DRY-HAIR" },
  { id: 6, name: "DAMAGED-HAIR" },
  { id: 7, name: "COLORED-HAIR" },
  { id: 8, name: "CURLY-COILY-HAIR" },
  { id: 9, name: "FINE-HAIR" },
  { id: 10, name: "OILY-HAIR" },
  { id: 11, name: "HAIR-LOSS" },
  { id: 12, name: "DANDRUFF-HAIR" },
];

const SKIN_SUB_FLAGS = [
  { id: 14, name: "ACNE-SKIN" },
  { id: 15, name: "DARK-CIRCLES-SKIN" },
  { id: 16, name: "ECZEMA-SKIN" },
  { id: 17, name: "OILY-SKIN" },
  { id: 18, name: "BLACKHEADS-SKIN" },
  { id: 19, name: "PIGMENTATION-SPOTS-SKIN" },
  { id: 20, name: "ENLARGED-PORES" },
];

const ALL_FILTER_FLAGS = [...HAIR_SUB_FLAGS, ...SKIN_SUB_FLAGS];
function IngredientPicker({
  visible,
  title,
  keysList,
  selectedKeys,
  onToggleKey,
  onClose,
}: {
  visible: boolean;
  title: string;
  keysList: string[];
  selectedKeys: string[];
  onToggleKey: (k: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return keysList.slice(0, 200); // show first chunk if empty
    return keysList.filter(k => k.toLowerCase().includes(s)).slice(0, 200);
  }, [q, keysList]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { maxHeight: "90%" }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.headerBtn}>
              <Text style={{ fontWeight: "900" }}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            placeholder="Search ingredient..."
            value={q}
            onChangeText={setQ}
            style={styles.input}
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => {
              const active = selectedKeys.includes(item);
              return (
                <Pressable
                  onPress={() => onToggleKey(item)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    marginBottom: 8,
                    backgroundColor: active ? "#D87355" : "#F3F3F3",
                  }}
                >
                  <Text style={{ color: active ? "#fff" : "#111", fontWeight: "700" }}>
                    {item}
                  </Text>
                </Pressable>
              );
            }}
          />

          <View style={{ height: 10 }} />
        </View>
      </View>
    </Modal>
  );
}
function extractIngredientIds(obj: any): number[] {
  const ids: number[] = [];
  Object.values(obj).forEach((v: any) => {
    if (typeof v === "number") ids.push(v);
    else if (Array.isArray(v)) ids.push(...v);
  });
  return [...new Set(ids)];
}

type TaggedProduct = Product & { __flag: "SPONSORED" | "TREND" | "BEST_PRODUCT" };
function SkeletonCard() {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  return (
    <Animated.View style={[sk.card, { opacity }]}>
      <View style={sk.image} />
      <View style={sk.line1} />
      <View style={sk.line2} />
      <View style={sk.scoreRow}>
        <View style={sk.dot} />
        <View style={sk.score} />
      </View>
    </Animated.View>
  );
}

function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={sk.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
const FLAG_IDS = { BEST_PRODUCT: 1, TREND: 2, SPONSORED: 3 } as const;

const CATEGORIES = [
  { id: "all", label: "Tous" },
  { id: "hair", label: "Cheveux" },
  { id: "skin", label: "Peau" },
];

export default function ExploreScreen() {
 
  const router = useRouter();
  // popup
  const [filterVisible, setFilterVisible] = useState(false);
  const [filtersEnabled, setFiltersEnabled] = useState(false);

  // brand
  const [brandSearch, setBrandSearch] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);

  // ingredients
  const ingredientKeys = useMemo(() => Object.keys(ingredientsJson), []);

  // flags
  const [selectedFlags, setSelectedFlags] = useState<number[]>([]);
  // Sub-subcategories
  const [selectedSubSubCategories, setSelectedSubSubCategories] = useState<number[]>([]);
  //Ingredients
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [excludeIngredientSearch, setExcludeIngredientSearch] = useState("");
  const [selectedIncludeKeys, setSelectedIncludeKeys] = useState<string[]>([]);
  const [selectedExcludeKeys, setSelectedExcludeKeys] = useState<string[]>([]);
  const [includePickerOpen, setIncludePickerOpen] = useState(false);
  const [excludePickerOpen, setExcludePickerOpen] = useState(false);
  // score
  const [minScore, setMinScore] = useState("0");
  const [maxScore, setMaxScore] = useState("20");
  // params when coming from subcategory page:
  const params = useLocalSearchParams<{ flagId?: string; title?: string; mainId?: string }>();
  const selectedFlagId = params.flagId ? Number(params.flagId) : null;

  // header title
  const headerTitle = params.title ? String(params.title) : "Meilleurs produits";

  // when we open as subcategory, set default chip
  const defaultChip = params.mainId === "4" ? "hair" : params.mainId === "13" ? "skin" : "all";
  const [activeCat, setActiveCat] = useState(defaultChip);

  //Brand autocomplete
  
  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return [];
    return brandsJson
      .filter((b) =>
        b.name.toLowerCase().includes(brandSearch.toLowerCase())
      )
      .slice(0, 15);
  }, [brandSearch]);
  const selectedIncludeIngredients = useMemo(() => {
    const ids: number[] = [];
    selectedIncludeKeys.forEach((k) => {
      ids.push(...extractIngredientIds((ingredientsJson as any)[k]));
    });
    return [...new Set(ids)];
  }, [selectedIncludeKeys]);
  
  const selectedExcludeIngredients = useMemo(() => {
    const ids: number[] = [];
    selectedExcludeKeys.forEach((k) => {
      ids.push(...extractIngredientIds((ingredientsJson as any)[k]));
    });
    return [...new Set(ids)];
  }, [selectedExcludeKeys]);
  //SEARCH query
  const qSearch = useProductsSearchInfinite(
    {
      brandIds: selectedBrands,
      includeIngredientIds: selectedIncludeIngredients,
      excludeIngredientIds: selectedExcludeIngredients,
      flagIds: selectedFlags,
      subSubCategoryIds: selectedSubSubCategories,
      minScore: Number(minScore),
      maxScore: Number(maxScore),
      limit: 10,
    },
    filtersEnabled
  );
  const filteredIncludeIngredientKeys = useMemo(() => {
    const q = ingredientSearch.trim().toLowerCase();
    if (!q) return [];
    return ingredientKeys.filter(k => k.toLowerCase().includes(q)).slice(0, 30);
  }, [ingredientSearch, ingredientKeys]);
  
  const filteredExcludeIngredientKeys = useMemo(() => {
    const q = excludeIngredientSearch.trim().toLowerCase();
    if (!q) return [];
    return ingredientKeys.filter(k => k.toLowerCase().includes(q)).slice(0, 30);
  }, [excludeIngredientSearch, ingredientKeys]);
  // IMPORTANT: when params change, reset chip too
  useEffect(() => {
    setActiveCat(defaultChip);
  }, [defaultChip]);

  // ✅ Infinite queries
  const qSponsored = useProductsByFlagInfinite(FLAG_IDS.SPONSORED, !selectedFlagId, 10);
  const qTrend = useProductsByFlagInfinite(FLAG_IDS.TREND, !selectedFlagId, 10);
  const qBest = useProductsByFlagInfinite(FLAG_IDS.BEST_PRODUCT, !selectedFlagId, 10);

  // subcategory mode: one flag only
  const qSingle = useProductsByFlagInfinite(selectedFlagId ?? 0, !!selectedFlagId, 10);

  // flatten pages
  const flatten = (q: any): Product[] => {
    const pages = q?.data?.pages ?? [];
    return pages.flatMap((p: any) => p?.data ?? []);
  };


  const filteredIngredients = useMemo(() => {
    if (!ingredientSearch.trim()) return [];
    return ingredientKeys
      .filter((k) =>
        k.toLowerCase().includes(ingredientSearch.toLowerCase())
      )
      .slice(0, 20);
  }, [ingredientSearch]);
  const filteredIngredientKeys = useMemo(() => {
    if (!ingredientSearch.trim()) return [];
    return ingredientKeys
      .filter((k) =>
        k.toLowerCase().includes(ingredientSearch.toLowerCase())
      )
      .slice(0, 20);
  }, [ingredientSearch]);
   // Reset filters
   const resetAllFilters = () => {
    setFiltersEnabled(false);
    setSelectedBrands([]);
    setSelectedFlags([]);
    setSelectedSubSubCategories([]);
    setSelectedIncludeKeys([]);
    setSelectedExcludeKeys([]);
    setBrandSearch("");
    setIngredientSearch("");
    setExcludeIngredientSearch("");
    setMinScore("0");
    setMaxScore("20");
  };
  
  const hasActiveFilters = useMemo(() => {
    const scoreChanged = minScore !== "0" || maxScore !== "20";
  
    return (
      selectedBrands.length > 0 ||
      selectedFlags.length > 0 ||
      selectedSubSubCategories.length > 0 ||
      selectedIncludeKeys.length > 0 ||
      selectedExcludeKeys.length > 0 ||
      scoreChanged
    );
  }, [
    selectedBrands,
    selectedFlags,
    selectedSubSubCategories,
    selectedIncludeKeys,
    selectedExcludeKeys,
    minScore,
    maxScore,
  ]);
  const data: TaggedProduct[] = useMemo(() => {
    // subcategory mode must win over old filters
    if (selectedFlagId) {
      return flatten(qSingle).map((p) => ({
        ...p,
        __flag: "BEST_PRODUCT" as const,
      }));
    }
  
    if (filtersEnabled) {
      const pages = qSearch.data?.pages ?? [];
      return pages.flatMap((p: any) => p.data ?? []).map((p: any) => ({
        ...p,
        __flag: "BEST_PRODUCT" as const,
      }));
    }
  
    const seen = new Set<string>();
    const out: TaggedProduct[] = [];
  
    const push = (list: Product[], flag: TaggedProduct["__flag"]) => {
      for (const p of list) {
        const key = String(p.ean || "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push({ ...p, __flag: flag });
      }
    };
  
    push(flatten(qSponsored), "SPONSORED");
    push(flatten(qTrend), "TREND");
    push(flatten(qBest), "BEST_PRODUCT");
  
    return out;
  }, [
    selectedFlagId,
    qSingle.data,
    filtersEnabled,
    qSearch.data,
    qSponsored.data,
    qTrend.data,
    qBest.data,
  ]);

  const onEndReached = () => {
    if (filtersEnabled) {
      if (qSearch.hasNextPage && !qSearch.isFetchingNextPage) {
        qSearch.fetchNextPage();
      }
      return;
    }    
    if (selectedFlagId) {
      if (qSingle.hasNextPage && !qSingle.isFetchingNextPage) qSingle.fetchNextPage();
      return;
    }

    // fetch next pages for all 3 lists (keeps sections growing)
    if (qSponsored.hasNextPage && !qSponsored.isFetchingNextPage) qSponsored.fetchNextPage();
    if (qTrend.hasNextPage && !qTrend.isFetchingNextPage) qTrend.fetchNextPage();
    if (qBest.hasNextPage && !qBest.isFetchingNextPage) qBest.fetchNextPage();
  };

  const resetExplore = () => {
    router.replace("/(main)/explore"); // clears params
  };

  const renderItem = ({ item }: { item: TaggedProduct }) => {
    const img = item.images?.[0]?.thumbnail || item.images?.[0]?.image;
    const isSponsored = item.__flag === "SPONSORED";
    const isTrend = item.__flag === "TREND";

    const borderColor = isSponsored ? "#D87355" : "rgba(0,0,0,0)";
    const titleColor = isSponsored ? "#D87355" : isTrend ? "#046E7C" : "#3F3B37";
  
    return (
      <Pressable onPress={() => router.push({ pathname: "/product/[ean]", params: { ean: item.ean } })} style={styles.cardWrap}>
        <View style={[styles.card, isSponsored && { borderColor, borderWidth: 1.5 }]}>
          <View style={styles.imageWrap}>
            {img ? <Image source={{ uri: img }} style={styles.image} contentFit="cover" /> : <View style={[styles.image, { backgroundColor: "rgba(0,0,0,0.06)" }]} />}

            {isSponsored ? (
              <View style={styles.sponsoredPill}>
                <Text style={styles.sponsoredPillText}>Contenu Sponsorisé</Text>
              </View>
            ) : null}

            {isTrend ? (
              <View style={styles.badgeWrap}>
                <BestProductBadge width={44} height={44} />
              </View>
            ) : null}
          </View>

          <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{item.brand?.name || " "}</Text>
          <Text style={styles.scoreText}>{(item.validScore ?? 0)}/20</Text>
        </View>
      </Pressable>
    );
  };
  const skeletonData = Array.from({ length: 6 }).map((_, i) => ({ id: `sk-${i}` }));

  const loading =
  selectedFlagId
    ? qSingle.isLoading
    : filtersEnabled
    ? (qSearch.isLoading || qSearch.isFetching)
    : (qSponsored.isLoading || qTrend.isLoading || qBest.isLoading);
  const initialLoading = loading && data.length === 0;

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (selectedFlagId && params.mainId) {
              router.replace(`/(main)/category/${params.mainId}`);
              return;
            }

            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/(main)");
            }
          }}
          style={styles.headerBtn}
        >
          <ArrowLeftIcon />
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <Pressable onPress={() => setFilterVisible(true)} style={styles.headerBtn}>
          <FilterIcon width={20} height={20} />
        </Pressable>
        {/* <Pressable onPress={resetExplore} style={styles.headerBtn}>
          <RefreshIcon height={22} width={22}></RefreshIcon>
        </Pressable> */}
      </View>

      {/* Chips */}
      <FlatList
        data={initialLoading ? skeletonData : data}
        keyExtractor={(item: any) => item.ean ?? item.id}
        numColumns={2}
        columnWrapperStyle={styles.colWrap}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) =>
          initialLoading ? <SkeletonCard /> : renderItem({ item } as any)
        }
        onEndReached={initialLoading ? undefined : onEndReached}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          !initialLoading ? (
            <View style={{ padding: 24 }}>
              <Text style={{ color: "rgba(63,59,55,0.6)", fontWeight: "700" }}>
                Aucun produit.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          !initialLoading &&
          (
            filtersEnabled
              ? qSearch.isFetchingNextPage
              : selectedFlagId
              ? qSingle.isFetchingNextPage
              : qSponsored.isFetchingNextPage ||
                qTrend.isFetchingNextPage ||
                qBest.isFetchingNextPage
          ) ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : null
        
        }
      />
      <Modal visible={filterVisible} transparent animationType="slide">
  <View style={styles.modalBackdrop}>
    <View style={styles.modalSheet}>
      <Text style={styles.modalTitle}>Filtres</Text>

      <ScrollView
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
      >
        {/* BRAND */}
        <TextInput
          placeholder="Search brand..."
          value={brandSearch}
          onChangeText={setBrandSearch}
          style={styles.input}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
          {selectedBrands.map((id) => {
            const b = brandsJson.find((x) => x.id === id);
            if (!b) return null;
            return (
              <Pressable
                key={id}
                style={[styles.tag, styles.tagActive]}
                onPress={() =>
                  setSelectedBrands((p) => p.filter((x) => x !== id))
                }
              >
                <Text style={{ color: "#fff" }}>{b.name} ✕</Text>
              </Pressable>
            );
          })}
        </View>
        {filteredBrands.map((b) => (
          <Pressable
            key={b.id}
            style={styles.tag}
            onPress={() =>
              setSelectedBrands((p) =>
                p.includes(b.id) ? p : [...p, b.id]
              )
            }
          >
            <Text>{b.name}</Text>
          </Pressable>
        ))}
        <Text style={styles.sectionTitle}>Ingredients (include)</Text>

        <Pressable
          onPress={() => setIncludePickerOpen(true)}
          style={[styles.input, { justifyContent: "center" }]}
        >
          <Text style={{ color: "rgba(0,0,0,0.55)" }}>
            {selectedIncludeKeys.length ? `${selectedIncludeKeys.length} selected` : "Select ingredients..."}
          </Text>
        </Pressable>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {selectedIncludeKeys.map((k) => (
            <Pressable
              key={k}
              style={[styles.tag, styles.tagActive]}
              onPress={() => setSelectedIncludeKeys((p) => p.filter((x) => x !== k))}
            >
              <Text style={{ color: "#fff" }}>{k} ✕</Text>
            </Pressable>
          ))}
        </View>

        {/* suggestions */}
        {filteredIngredientKeys.map((k) => (
          <Pressable
            key={k}
            style={styles.tag}
            onPress={() =>
              setSelectedIncludeKeys((p) =>
                p.includes(k) ? p : [...p, k]
              )
            }
          >
            <Text>{k}</Text>
          </Pressable>
        ))}
        
        {/* FLAGS */}
        {/* <Text style={styles.sectionTitle}>Flags</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {ALL_FILTER_FLAGS.map((f) => {
            const active = selectedFlags.includes(f.id);
            return (
              <Pressable
                key={f.id}
                onPress={() =>
                  setSelectedFlags((p) =>
                    active ? p.filter((x) => x !== f.id) : [...p, f.id]
                  )
                }
                style={[styles.tag, active && styles.tagActive]}
              >
                <Text>{f.name}</Text>
              </Pressable>
            );
          })}
        </View> */}
        <Text style={styles.sectionTitle}>Ingredients (exclude)</Text>

        <Pressable
          onPress={() => setExcludePickerOpen(true)}
          style={[styles.input, { justifyContent: "center" }]}
        >
          <Text style={{ color: "rgba(0,0,0,0.55)" }}>
            {selectedExcludeKeys.length ? `${selectedExcludeKeys.length} selected` : "Select ingredients to exclude..."}
          </Text>
        </Pressable>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {selectedExcludeKeys.map((k) => (
            <Pressable
              key={k}
              style={[styles.tag, styles.tagActive]}
              onPress={() => setSelectedExcludeKeys((p) => p.filter((x) => x !== k))}
            >
              <Text style={{ color: "#fff" }}>{k} ✕</Text>
            </Pressable>
          ))}
        </View>
        {/* Collections */}
        <Text style={styles.sectionTitle}>Collections</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {subSubCategoriesJson.slice(0, 80).map((s) => {
            const active = selectedSubSubCategories.includes(s.id);

            return (
              <Pressable
                key={s.id}
                style={[styles.tag, active && styles.tagActive]}
                onPress={() =>
                  setSelectedSubSubCategories((p) =>
                    active ? p.filter((x) => x !== s.id) : [...p, s.id]
                  )
                }
              >
                <Text>{s.name}</Text>
              </Pressable>
            );
          })}
        </View>
        {/* SCORE */}
        <Text style={styles.sectionTitle}>Score</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            keyboardType="numeric"
            value={minScore}
            onChangeText={setMinScore}
            placeholder="Min"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            keyboardType="numeric"
            value={maxScore}
            onChangeText={setMaxScore}
            placeholder="Max"
          />
        </View>
      </ScrollView>

      <View style={styles.modalActions}>
  <Pressable
    style={styles.clearBtn}
    onPress={resetAllFilters}
  >
    <Text style={styles.clearBtnText}>Effacer les filtres</Text>
  </Pressable>

  <View style={{ flexDirection: "row", gap: 10 }}>
    <Pressable
      style={styles.cancelBtn}
      onPress={() => setFilterVisible(false)}
    >
      <Text>Annuler</Text>
    </Pressable>

    <Pressable
      style={styles.applyBtn}
      onPress={() => {
        setFiltersEnabled(hasActiveFilters);
        setFilterVisible(false);
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700" }}>
        Appliquer
      </Text>
    </Pressable>
  </View>
</View>
    </View>
  </View>
</Modal>
<IngredientPicker
  visible={includePickerOpen}
  title="Select ingredients to include"
  keysList={ingredientKeys}
  selectedKeys={selectedIncludeKeys}
  onToggleKey={(k) =>
    setSelectedIncludeKeys((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
  }
  onClose={() => setIncludePickerOpen(false)}
/>

<IngredientPicker
  visible={excludePickerOpen}
  title="Select ingredients to exclude"
  keysList={ingredientKeys}
  selectedKeys={selectedExcludeKeys}
  onToggleKey={(k) =>
    setSelectedExcludeKeys((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
  }
  onClose={() => setExcludePickerOpen(false)}
/>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4", paddingTop: 34 },
  header: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnText: { fontSize: 18, fontWeight: "900", color: "rgba(63,59,55,0.75)" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#3F3B37" },

  pillsRow: {paddingVertical: 15, paddingHorizontal: 15,paddingBottom:30, gap: 10, backgroundColor: "#fff", width: "100%" },
  pill: { paddingHorizontal: 18, height: 42, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.04)", alignItems: "center", justifyContent: "center" },
  pillActive: { backgroundColor: "#DFF1EA" },
  pillText: { fontWeight: "800", color: "rgba(63,59,55,0.75)" },
  pillTextActive: { color: "#3F3B37" },

  listContent: { padding: 16, paddingBottom: 24 },
  colWrap: { justifyContent: "space-between" },

  cardWrap: { width: "48%", marginBottom: 14 },
  card: {
    backgroundColor: "rgb(255, 255, 255)",
    borderRadius: 22,
    overflow: "hidden",
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  imageWrap: { position: "relative" },
  image: { width: "100%", height: 170 },

  sponsoredPill: { position: "absolute", right: 10, bottom: 10, backgroundColor: "#D87355", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  sponsoredPillText: { color: "#fff", fontWeight: "900", fontSize: 11 },

  badgeWrap: { position: "absolute", right: 10, top: 10 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F3F3F3",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#eee",
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  tagActive: {
    backgroundColor: "#D87355",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  applyBtn: {
    backgroundColor: "#D87355",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  title: { marginTop: 12, paddingHorizontal: 12, fontSize: 16, fontWeight: "900" },
  subtitle: { marginTop: 6, paddingHorizontal: 12, color: "rgba(63,59,55,0.55)", fontWeight: "700" },
  scoreText: { marginTop: 8, paddingHorizontal: 12, color: "rgba(63,59,55,0.6)", fontWeight: "800" },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F3F3F3",
  },
  
  clearBtnText: {
    color: "#D87355",
    fontWeight: "700",
  },
  
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F3F3F3",
  },
});
const sk = StyleSheet.create({
  grid: {
    padding: 16,
    gap: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.75)",
    // soft shadow
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  image: {
    height: 110,
    borderRadius: 12,
    backgroundColor: "rgba(63,59,55,0.10)",
  },
  line1: {
    height: 14,
    borderRadius: 10,
    backgroundColor: "rgba(63,59,55,0.10)",
    marginTop: 10,
    width: "88%",
  },
  line2: {
    height: 14,
    borderRadius: 10,
    backgroundColor: "rgba(63,59,55,0.08)",
    marginTop: 8,
    width: "62%",
  },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  dot: { width: 10, height: 10, borderRadius: 99, backgroundColor: "rgba(63,59,55,0.10)" },
  score: { height: 12, width: 64, borderRadius: 10, backgroundColor: "rgba(63,59,55,0.10)" },
  
});