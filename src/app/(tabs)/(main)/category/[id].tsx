import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import ArrowLeftIcon from  "../../../../../assets/icons/arrow-left.svg"

import type { ImageSourcePropType } from "react-native";

type Flag = {
  id: number;
  name: string;
  totalProducts?: number;
  img: ImageSourcePropType;
};

type SubCategory = {
  id: number;
  title: string;
  productsCount: number;
  iconBg: string;
  img: ImageSourcePropType;
};

type CategoryMeta = {
  id: number;              // main flagId
  title: string;
  heroTitle: string;
  heroDesc: string;
  heroBg: string;
  heroIcon: string;
  subCategories: SubCategory[];
};

// ------------------ FLAGS (static for now) ------------------
const MAIN_FLAGS = {
  HAIR: 4,
  SKIN: 13,
} as const;

const HAIR_SUB_FLAGS: Flag[] = [
  { id: 5, name: "DRY-HAIR", totalProducts: 0, img: require("../../../../../assets/img/ctg/dry-hair.png") },
  { id: 6, name: "DAMAGED-HAIR", totalProducts: 0, img: require("../../../../../assets/img/ctg/damaged-hair.png") },
  { id: 7, name: "COLORED-HAIR", totalProducts: 0, img: require("../../../../../assets/img/ctg/colored-hair.png") },
  { id: 8, name: "CURLY-COILY-HAIR", totalProducts: 0, img: require("../../../../../assets/img/ctg/curly.png") },
  { id: 9, name: "FINE-HAIR", totalProducts: 0, img: require("../../../../../assets/img/ctg/thin-hair.png") },
  { id: 10, name: "OILY-HAIR", totalProducts: 0, img: require("../../../../../assets/img/ctg/oily-hair.png") },
  { id: 11, name: "HAIR-LOSS", totalProducts: 0, img: require("../../../../../assets/img/ctg/hair-loss.png") },
  { id: 12, name: "DANDRUFF-HAIR", totalProducts: 0, img: require("../../../../../assets/img/ctg/dandruff.png") },
];

const SKIN_SUB_FLAGS: Flag[] = [
  { id: 14, name: "ACNE-SKIN", totalProducts: 0, img: require("../../../../../assets/img/ctg/acne.png") },
  { id: 15, name: "DARK-CIRCLES-SKIN", totalProducts: 0, img: require("../../../../../assets/img/ctg/cernes.png") },
  { id: 16, name: "ECZEMA-SKIN", totalProducts: 0, img: require("../../../../../assets/img/ctg/eczema.png") },
  { id: 17, name: "OILY-SKIN", totalProducts: 0, img: require("../../../../../assets/img/ctg/oily-skin.png") },
  { id: 18, name: "BLACKHEADS-SKIN", totalProducts: 0, img: require("../../../../../assets/img/ctg/blackheads.png") },
  { id: 19, name: "PIGMENTATION-SPOTS-SKIN", totalProducts: 0, img: require("../../../../../assets/img/ctg/pigmentation.png") },
  { id: 20, name: "ENLARGED-PORES", totalProducts: 0, img: require("../../../../../assets/img/ctg/enlarged.png") },
];

// ------------------ label mapping ------------------
const FLAG_LABEL_FR: Record<string, string> = {
  "DRY-HAIR": "Cheveux\nsecs",
  "DAMAGED-HAIR": "Cheveux\nabîmés",
  "COLORED-HAIR": "Cheveux\ncolorés",
  "CURLY-COILY-HAIR": "Bouclés /\nFrisés",
  "FINE-HAIR": "Cheveux\nfins",
  "OILY-HAIR": "Cheveux\ngrass",
  "HAIR-LOSS": "Chute de\ncheveux",
  "DANDRUFF-HAIR": "Pellicules",

  "ACNE-SKIN": "Imperfections\n/ Acné",
  "DARK-CIRCLES-SKIN": "Cernes",
  "ECZEMA-SKIN": "Eczéma",
  "OILY-SKIN": "Peau\ngrasse",
  "BLACKHEADS-SKIN": "Points\nnoirs",
  "PIGMENTATION-SPOTS-SKIN": "Taches\npigmentaires",
  "ENLARGED-PORES": "Pores\ndilatés",
};

function prettifyFlagName(name: string) {
  return (
    FLAG_LABEL_FR[name] ??
    name
      .replace(/-SKIN|-HAIR/g, "")
      .replace(/-/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  );
}

// quick visual palette (reused)
const ICONS = [
  { icon: "https://img.icons8.com/ios-filled/100/water.png", bg: "#E4F2FB" },
  { icon: "https://img.icons8.com/ios-filled/100/time.png", bg: "#F3DCE3" },
  { icon: "https://img.icons8.com/ios-filled/100/sun.png", bg: "#F7F0E3" },
  { icon: "https://img.icons8.com/ios-filled/100/like--v1.png", bg: "#DFF1EA" },
  { icon: "https://img.icons8.com/ios-filled/100/magic-wand.png", bg: "#F3DCE3" },
  { icon: "https://img.icons8.com/ios-filled/100/sad.png", bg: "#E4F2FB" },
  { icon: "https://img.icons8.com/ios-filled/100/paint-palette.png", bg: "#F7F0E3" },
  { icon: "https://img.icons8.com/ios-filled/100/leaf.png", bg: "#DFF1EA" },
];

function buildSubCats(flags: Flag[]): SubCategory[] {
  return flags.map((f, idx) => {
    const v = ICONS[idx % ICONS.length];
    return {
      id: f.id,
      title: prettifyFlagName(f.name),
      productsCount: f.totalProducts ?? 0,
      icon: v.icon,
      iconBg: v.bg,
      img: f.img,
    };
  });
}

const CATEGORY_META: Record<number, CategoryMeta> = {
  [MAIN_FLAGS.HAIR]: {
    id: MAIN_FLAGS.HAIR,
    title: "Cheveux",
    heroTitle: "Soins des\nCheveux",
    heroDesc: "Découvrez nos produits\nadaptés à vos besoins\ncapillaires",
    heroBg: "#DFF1EA",
    heroIcon: require("../../../../../assets/img/hair.png"),
    subCategories: buildSubCats(HAIR_SUB_FLAGS),
  },
  [MAIN_FLAGS.SKIN]: {
    id: MAIN_FLAGS.SKIN,
    title: "Peau",
    heroTitle: "Soins de la\nPeau",
    heroDesc: "Découvrez nos produits\nadaptés à votre type de\npeau",
    heroBg: "#F3E3DE",
    heroIcon: require("../../../../../assets/img/skin.png"),
    subCategories: buildSubCats(SKIN_SUB_FLAGS),
  },
};
// ------------------------------------------------------------

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mainFlagId = Number(id);

  const category = CATEGORY_META[mainFlagId];

  // Coming soon if not Hair/Skin
  if (!category) {
    return (
      <View style={[styles.page, { justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#3F3B37" }}>Bientôt disponible</Text>
        <Text style={{ marginTop: 10, color: "rgba(63,59,55,0.65)", textAlign: "center", lineHeight: 20 }}>
          Cette catégorie est en cours de préparation.
        </Text>

        <Pressable onPress={() => router.back()} style={[styles.filterBtn, { marginTop: 18 }]}>
          <Text style={styles.filterText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const countLabel = useMemo(() => {
    const n = category.subCategories.length;
    return `${n} sous-catégories`;
  }, [category.subCategories.length]);

  const openSubCategory = (subFlagId: number, subTitle: string) => {
router.push({
    pathname: "/(main)/explore",
    params: {
      flagId: String(subFlagId),
      mainId: String(mainFlagId),  // 4 hair or 13 skin
      title: subTitle,
    },
  });
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={styles.iconText}><ArrowLeftIcon></ArrowLeftIcon></Text>
        </Pressable>

        <Text style={styles.topTitle}>{category.title}</Text>

        <Pressable onPress={() => {}} style={styles.iconBtn2}>
          {/* <Text style={styles.iconText}>i</Text> */}
        </Pressable>
      </View>

      {/* Hero card */}
      <View style={[styles.hero, { backgroundColor: category.heroBg }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{category.heroTitle}</Text>
          <Text style={styles.heroDesc}>{category.heroDesc}</Text>
        </View>

        <View style={styles.heroIconWrap}>
          <Image source={category.heroIcon} style={styles.heroIcon} />
        </View>
      </View>

      {/* Row: count + filter (placeholder) */}
      <View style={styles.rowBetween}>
        <Text style={styles.countText}>{countLabel}</Text>

      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {category.subCategories.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => openSubCategory(s.id, s.title)}

            style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
          >
            {/* <View style={[styles.circle, { backgroundColor: s.iconBg }]}>
            <Image source={s.img}                 style={[styles.icon, { width: 44, height: 44, borderRadius: 22 }]}
              contentFit="contain" />
            </View> */}
            <View style={[styles.circle, { backgroundColor: s.iconBg }]}>
              <Image
                source={s.img}
                style={[styles.icon, { width: 44, height: 44, borderRadius: 22 }]}
              />
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {s.title}
            </Text>

            {/* show count only if > 0 */}
            {s.productsCount > 0 ? (
              <Text style={styles.cardCount}>{s.productsCount} produits</Text>
            ) : (
              <Text style={styles.cardCountMuted}> </Text>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4", paddingTop: 22 },
  content: { padding: 16, paddingBottom: 24 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 10,
  },
  topTitle: { fontSize: 20, fontWeight: "900", color: "#3F3B37" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn2: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18, fontWeight: "900", color: "rgba(63,59,55,0.75)" },

  hero: {
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  heroTitle: { fontSize: 26, fontWeight: "900", color: "#3F3B37", lineHeight: 30 },
  heroDesc: { marginTop: 10, color: "rgba(63,59,55,0.65)", fontSize: 16, lineHeight: 22 },

  heroIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "transparent", 
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroIcon: { width: "100%", height: "100%"},

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  countText: { color: "rgba(63,59,55,0.55)", fontWeight: "700" },

  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.08)",
  },
  filterIcon: { color: "rgba(63,59,55,0.65)", fontWeight: "900" },
  filterText: { color: "rgba(63,59,55,0.75)", fontWeight: "800" },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 14 },

  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingTop: 16,
    paddingLeft: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardIcon: { width: 28, height: 28 },
  cardTitle: { fontSize: 18, fontWeight: "900", color: "#3F3B37", lineHeight: 22 },
  cardCount: { marginTop: 8, color: "rgba(63,59,55,0.55)", fontWeight: "700" },
  cardCountMuted: { marginTop: 8, color: "transparent" },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",
  },
  icon: { width: 22, height: 22 },
});