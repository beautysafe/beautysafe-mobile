import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useFavorites } from "../../../hooks/useFavorites";
import { useAuth } from "../../../components/AuthProvider";
import NameIcon  from  "../../../../assets/icons/name.svg"
import EmailIcon  from  "../../../../assets/icons/email.svg"
import BirthdayIcon  from  "../../../../assets/icons/birthday.svg"
import SmileIcon  from  "../../../../assets/icons/smile.svg"
import HairIcon  from  "../../../../assets/icons/hair.svg"
import SettingIcon from "../../../../assets/icons/setting.svg"
import NotifIcon from "../../../../assets/icons/notif.svg"
import HeartRoseIcon from "../../../../assets/icons/heart-rose.svg"
import CodeBarIcon from "../../../../assets/icons/code-bar.svg"

import { apiFetch } from "../../../api/clientApi";
import { useQuery } from "@tanstack/react-query";
import { SvgUri } from "react-native-svg";

function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/users/me", { method: "GET" }),
    enabled,
  });
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "center" }}>{children}</View>;
}

function IconBubble({
  bg,
  icon,
}: {
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={[styles.iconBubble, { backgroundColor: bg }]}>
      {icon}
    </View>
  );
}

function InfoLine({
  iconBg,
  icon,
  label,
  value,
}: {
  iconBg: string;
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.infoLine}>
      <IconBubble bg={iconBg} icon={icon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "-"}</Text>
      </View>
    </View>
  );
}

function PrefRow({
  iconBg,
  icon,
  title,
  right,
  onPress,
}: {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.prefRow, { opacity: pressed ? 0.9 : 1 }]}>
      <IconBubble bg={iconBg} icon={icon} />
      <Text style={styles.prefTitle}>{title}</Text>
      <View style={{ flex: 1 }} />
      {right}
    </Pressable>
  );
}

function PillCard({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pillCard, { opacity: pressed ? 0.92 : 1 }]}>
      <View style={[styles.pillIconWrap, { backgroundColor: iconBg }]}>
        <Text style={styles.pillIcon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.pillTitle}>{title}</Text>
        <Text style={styles.pillSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { token, loading: tokenLoading, signOut  } = useAuth();

  const onLogout = async () => {
    await signOut ();
    qc.removeQueries({ queryKey: ["me"] });
    qc.removeQueries({ queryKey: ["favorites"] });
    router.replace("/(main)");
  };
  const { data: me } = useMe(!!token);
  const { favorites } = useFavorites(!!token);

  const favoritesCount = useMemo(() => {
    return favorites?.length ?? 0;
  }, [favorites]);
  // You can wire scansCount later when you have the endpoint.
  const scansCount = 0;

  const fullName = me?.fullName || "Invité";
  const email = me?.email || "-";
  const birthday = me?.birthday || me?.birthDate || "-";
  const skinType = me?.skinType || "-";
  const hairType = me?.hairType || "-";

  const avatar =
    me?.avatarUrl
      ? me?.avatarUrl
      : require("../../../../assets/img/avatar.png");


  const goLogin = () => router.push("/(auth)/login");
  const goRegister = () => router.push("/(auth)/register");

  const openFavorites = () => router.push("/(main)/favori");

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header gradient */}
        <LinearGradient
          colors={["#F4E2DD", "#EAF3EE"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.header}
        >

          <View style={styles.avatarWrap}>
            <Image source={avatar} style={styles.avatar} contentFit="cover" />
          </View>

          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.subTitle}>Mon profil beauté</Text>
        </LinearGradient>

        {/* If not logged in: show CTA */}
        {!token && !tokenLoading ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Connexion</Text>
            <Text style={styles.muted}>
              Connectez-vous pour sauvegarder vos favoris et accéder à votre profil.
            </Text>

            <View style={{ height: 12 }} />

            <Pressable onPress={goLogin} style={styles.bigBtn}>
              <Text style={styles.bigBtnText}>Se connecter</Text>
            </Pressable>

            <Pressable onPress={goRegister} style={[styles.bigBtn, styles.bigBtnAlt]}>
              <Text style={styles.bigBtnTextAlt}>S'inscrire</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Informations personnelles */}
            <View style={styles.card}>
              <Row>
                <Text style={styles.sectionIcon}>👤</Text>
                <Text style={styles.sectionTitle}>Informations personnelles</Text>
              </Row>

              <View style={{ height: 10 }} />

              <InfoLine
                iconBg="#DFF1EA"
                icon={<NameIcon width={22} height={22} />}
                label="Nom complet"
                value={fullName}
              />
              <InfoLine iconBg="#E4F2FB" icon={<EmailIcon width={22} height={22} />} label="Email" value={email} />
              <InfoLine iconBg="#F7F0E3" icon={<BirthdayIcon width={22} height={22} />} label="Date de naissance" value={birthday} />
              <InfoLine iconBg="#F3DCE3" icon={<SmileIcon width={22} height={22} />} label="Type de peau" value={skinType} />
              <InfoLine iconBg="#DFF1EA" icon={<HairIcon width={22} height={22} />} label="Type de cheveux" value={hairType} />
            </View>

            {/* Préférences */}
            <View style={styles.card}>
              <Row>
                <SettingIcon width={25} height={25}></SettingIcon>
                <Text style={styles.sectionTitle}> Préférences</Text>
              </Row>

              <View style={{ height: 12 }} />

              <PrefRow
                iconBg="#F7F0E3"
                icon={<NotifIcon width={22} height={22} />}
                title="Notifications"
                right={<View style={styles.fakeSwitch}><View style={styles.fakeKnob} /></View>}
                onPress={() => {}}
              />

              <PrefRow
                iconBg="#F3DCE3"
                icon={<HeartRoseIcon width={22} height={22} />}
                title="Produits favoris"
                right={<Text style={styles.count}>{favoritesCount}</Text>}
                onPress={openFavorites}
              />

              <PrefRow
                iconBg="#E4F2FB"
                icon={<CodeBarIcon width={22} height={22} />}
                title="Produits scannés"
                right={<Text style={styles.count}>{scansCount}</Text>}
                onPress={() => {}}
              />
            </View>

            {/* Routine & Recommandations */}
            {/* <View style={styles.card}>
              <Row>
                <Text style={styles.sectionIcon}>🌿</Text>
                <Text style={styles.sectionTitle}>Routine & Recommandations</Text>
              </Row>

              <View style={{ height: 12 }} />

              <PillCard icon="🌙" iconBg="#F3DCE3" title="Ma routine beauté" subtitle="7 étapes" onPress={() => {}} />
              <PillCard
                icon="❓"
                iconBg="#E4F2FB"
                title="Questionnaires complétés"
                subtitle="3 quiz"
                onPress={() => {}}
              />
              <PillCard
                icon="✨"
                iconBg="#F7F0E3"
                title="Recommandations"
                subtitle="12 produits suggérés"
                onPress={() => {}}
              />
            </View> */}

            {/* Bottom actions */}
            <Pressable onPress={() => router.push("/(main)/profile/edit")} style={[styles.bigBtn, styles.bigBtnSoft]}>
              <Text style={styles.bigBtnText}>✎  Modifier mon profil</Text>
            </Pressable>

            <Pressable onPress={onLogout} style={[styles.bigBtn, styles.bigBtnWhite]}>
              <Text style={styles.bigBtnTextAlt}>⎋  Déconnexion</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4" },
  content: { paddingBottom: 30 },

  header: {
    paddingTop: 26,
    paddingBottom: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  settingsBtn: {
    position: "absolute",
    right: 16,
    top: 26,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsIcon: { fontSize: 18 },

  avatarWrap: {
    alignSelf: "center",
    width: 116,
    height: 116,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    marginTop: 34,
  },
  avatar: { width: 104, height: 104, borderRadius: 999 },

  name: { marginTop: 14, fontSize: 30, fontWeight: "900", color: "#3F3B37", textAlign: "center" },
  subTitle: { marginTop: 6, color: "rgba(63,59,55,0.65)", fontWeight: "700", textAlign: "center" },

  card: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "rgb(255, 255, 255)",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  sectionIcon: { fontSize: 16, marginRight: 10, opacity: 0.9 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#3F3B37" },

  infoLine: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  iconBubble: { width: 44, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  iconEmoji: { fontSize: 18 },

  infoLabel: { color: "rgba(63,59,55,0.55)", fontWeight: "800", fontSize: 12 },
  infoValue: { marginTop: 2, color: "#3F3B37", fontWeight: "900", fontSize: 16 },

  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderRadius: 16,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.02)",
    marginBottom: 10,
  },
  prefTitle: { fontWeight: "900", color: "rgba(63,59,55,0.8)", fontSize: 15 },

  count: { fontWeight: "900", color: "rgba(63,59,55,0.55)" },

  fakeSwitch: {
    width: 52,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#DFF1EA",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  fakeKnob: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "white",
    marginLeft: 22,
  },

  pillCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.02)",
    marginBottom: 10,
  },
  pillIconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pillIcon: { fontSize: 18 },
  pillTitle: { fontWeight: "900", color: "#3F3B37", fontSize: 15 },
  pillSubtitle: { marginTop: 2, color: "rgba(63,59,55,0.55)", fontWeight: "700" },
  chev: { fontSize: 22, color: "rgba(63,59,55,0.35)", fontWeight: "900" },

  bigBtn: {
    marginTop: 12,
    marginHorizontal: 16,
    height: 54,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.07)",
  },
  bigBtnText: { fontSize: 16, fontWeight: "900", color: "#3F3B37" },

  bigBtnAlt: { backgroundColor: "rgba(255,255,255,0.78)" },
  bigBtnTextAlt: { fontSize: 16, fontWeight: "900", color: "rgba(63,59,55,0.75)" },

  bigBtnSoft: { backgroundColor: "rgba(192, 225, 232, 0.45)" },
  bigBtnWhite: { backgroundColor: "rgba(255,255,255,0.85)" },

  muted: { marginTop: 8, color: "rgba(63,59,55,0.6)", lineHeight: 20 },
});
