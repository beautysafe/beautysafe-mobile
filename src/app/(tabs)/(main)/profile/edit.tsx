// src/app/(main)/profile/edit.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../../../../api/clientApi";
import { updateMe } from "../../../../api/usersApi";
import { uploadToCloudinary } from "../../../../api/cloudinary";
import { useAuth } from "../../../../components/AuthProvider";
import { SelectField } from "../../../../components/SelectField";
import { HAIR_TYPES, SKIN_TYPES } from "../../../../constants/profileOptions";
import ArrowLeftIcon from "../../../../../assets/icons/arrow-left.svg"
function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/users/me", { method: "GET" }),
    enabled,
  });
}

export default function EditProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { token } = useAuth();

  const { data: me, isLoading } = useMe(!!token);

  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState(""); // YYYY-MM-DD
  const [address, setAddress] = useState("");
  const [hairType, setHairType] = useState("");
  const [skinType, setSkinType] = useState("");

  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // fill form once me loaded
  React.useEffect(() => {
    if (!me) return;
    setFullName(me.fullName || "");
    setBirthday(me.birthday || "");
    setAddress(me.address || "");
    setHairType(me.hairType || "");
    setSkinType(me.skinType || "");
  }, [me]);

  const currentAvatar = useMemo(() => {
    if (localAvatarUri) return localAvatarUri;
    return me?.avatarUrl
      ? me.avatarUrl
      : require("../../../../../assets/img/avatar.png");
  }, [localAvatarUri, me]);

  const pickAvatar = async () => {
    setErr(null);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr("Permission galerie refusée.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) setLocalAvatarUri(uri);
  };

  const onSave = async () => {
    try {
      setErr(null);
      setSaving(true);

      let avatarUrl: string | undefined = undefined;
      let avatarKey: string | undefined = undefined;

      // if user selected a new image => upload to cloudinary first
      if (localAvatarUri) {
        const up = await uploadToCloudinary(localAvatarUri);
        avatarUrl = up.secure_url;
        avatarKey = up.public_id; // optional
      }

      await updateMe({
        fullName: fullName.trim() || undefined,
        birthday: birthday.trim() || undefined,
        address: address.trim() || undefined,
        hairType: hairType.trim() || undefined,
        skinType: skinType.trim() || undefined,
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(avatarKey ? { avatarKey } : {}),
      });

      await qc.invalidateQueries({ queryKey: ["me"] });
      router.back();
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeftIcon></ArrowLeftIcon>
          </Pressable>
          <Text style={styles.topTitle}>Modifier mon profil</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarBlock}>
          <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
            <Image source={{ uri: currentAvatar }} style={styles.avatar} contentFit="cover" />
          </Pressable>
          <Pressable onPress={pickAvatar} style={styles.linkBtn}>
            <Text style={styles.linkText}>Changer la photo</Text>
          </Pressable>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Field label="Nom complet" value={fullName} onChangeText={setFullName} />
          <Field label="Date de naissance (YYYY-MM-DD)" value={birthday} onChangeText={setBirthday} />
          <Field label="Adresse" value={address} onChangeText={setAddress} />
          <SelectField
            label="Type de peau"
            value={skinType}
            onChange={setSkinType}
            options={SKIN_TYPES}
            />

            <SelectField
            label="Type de cheveux"
            value={hairType}
            onChange={setHairType}
            options={HAIR_TYPES}
            />
        </View>

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Pressable onPress={onSave} style={styles.saveBtn} disabled={saving}>
          <Text style={styles.saveText}>{saving ? "Enregistrement..." : "Enregistrer"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4", paddingTop: 34 },
  content: { padding: 16, paddingBottom: 28 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  topTitle: { fontSize: 18, fontWeight: "900", color: "#3F3B37" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18, fontWeight: "900", color: "rgba(63,59,55,0.75)" },

  avatarBlock: { alignItems: "center", marginBottom: 14 },
  avatarWrap: {
    width: 122,
    height: 122,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  avatar: { width: 112, height: 112, borderRadius: 999 },

  linkBtn: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.05)" },
  linkText: { fontWeight: "900", color: "rgba(63,59,55,0.75)" },

  card: {
    borderRadius: 22,
    backgroundColor: "white",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  label: { marginBottom: 8, color: "rgba(63,59,55,0.75)", fontWeight: "800" },
  input: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },

  saveBtn: {
    marginTop: 14,
    height: 54,
    borderRadius: 22,
    backgroundColor: "rgba(192, 225, 232, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { fontSize: 16, fontWeight: "900", color: "#3F3B37" },

  err: { marginTop: 12, color: "#B42318", fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#FBF8F4" },
  muted: { marginTop: 10, color: "rgba(63,59,55,0.6)" },
});
