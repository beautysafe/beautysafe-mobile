import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../components/AuthProvider"; // adjust path if needed

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    try {
      setErr(null);
      setLoading(true);
      await signIn(email.trim().toLowerCase(), password);
      router.replace("/(main)");
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Connectez-vous à votre compte</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" />

      <Text style={styles.label}>Mot de passe</Text>
      <View style={styles.passwordWrap}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={styles.passwordInput}
          secureTextEntry={!showPassword}
        />
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          style={styles.eyeBtn}
        >
          <Text style={styles.eyeText}>
            {showPassword ? "🙈" : "👁️"}
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={() => setRememberMe((v) => !v)}
        style={styles.rememberRow}
      >
        <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
          {rememberMe && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <Text style={styles.rememberText}>Se souvenir de moi</Text>
      </Pressable>
      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Pressable onPress={onSubmit} style={styles.btn} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "..." : "Se connecter"}</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/(auth)/register")} style={{ marginTop: 16 }}>
        <Text style={{ textAlign: "center" }}>
          Vous n’avez pas de compte ? <Text style={{ fontWeight: "900" }}>S'inscrire</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FBF8F4", padding: 20, paddingTop: 80 },
  title: { fontSize: 34, fontWeight: "900", color: "#3F3B37", textAlign: "center", marginBottom: 30 },
  label: { marginTop: 16, marginBottom: 8, color: "rgba(63,59,55,0.75)", fontWeight: "700" },
  input: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  btn: { marginTop: 26, height: 54, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontWeight: "900", color: "#3F3B37" },
  err: { marginTop: 10, color: "#B42318", fontWeight: "800" },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  passwordInput: {
    flex: 1,
    padding: 14,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  eyeText: {
    fontSize: 18,
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: "#3F3B37",
    borderColor: "#3F3B37",
  },
  checkboxTick: {
    color: "#fff",
    fontWeight: "900",
  },
  rememberText: {
    color: "rgba(63,59,55,0.75)",
    fontWeight: "700",
  },

});
