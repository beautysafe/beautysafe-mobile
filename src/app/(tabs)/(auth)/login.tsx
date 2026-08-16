import React, {
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "../../../components/AuthProvider";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [showPassword, setShowPassword] =
    useState(false);

  /**
   * This DOES NOT control whether the user stays logged in.
   *
   * Persistent login is handled by:
   * access token + refresh token.
   *
   * This option only controls whether we allow the
   * device password manager to save/autofill credentials.
   */
  const [
    rememberPassword,
    setRememberPassword,
  ] = useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 &&
      password.length >= 6 &&
      !loading
    );
  }, [
    email,
    password,
    loading,
  ]);

  const onSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    Keyboard.dismiss();

    try {
      setError(null);
      setLoading(true);

      await signIn(
        email.trim().toLowerCase(),
        password
      );

      router.replace(
        "/(tabs)/(main)"
      );
    } catch (error: any) {
      const status =
        error?.status;

      if (status === 401) {
        setError(
          "Email ou mot de passe incorrect."
        );
      } else if (
        error?.code ===
        "API_TIMEOUT"
      ) {
        setError(
          "Le serveur met trop de temps à répondre. Veuillez réessayer."
        );
      } else {
        setError(
          error?.message ||
            "Impossible de vous connecter. Veuillez réessayer."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          Connectez-vous à votre compte
        </Text>

        {/* Email */}
        <Text style={styles.label}>
          Email
        </Text>

        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError(null);
          }}
          style={styles.input}
          placeholder="example@mail.com"
          placeholderTextColor="#A29C96"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"

          /*
           * If user allows password saving,
           * expose this field to the OS credential manager.
           */
          autoComplete={
            rememberPassword
              ? "email"
              : "off"
          }
          textContentType={
            rememberPassword
              ? "username"
              : "none"
          }
          importantForAutofill={
            rememberPassword
              ? "yes"
              : "no"
          }
        />

        {/* Password */}
        <Text style={styles.label}>
          Mot de passe
        </Text>

        <View
          style={styles.passwordWrap}
        >
          <TextInput
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            style={styles.passwordInput}
            placeholder="Votre mot de passe"
            placeholderTextColor="#A29C96"
            secureTextEntry={
              !showPassword
            }
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={
              onSubmit
            }

            /*
             * Let Android/iOS password manager
             * handle the password securely.
             */
            autoComplete={
              rememberPassword
                ? "current-password"
                : "off"
            }
            textContentType={
              rememberPassword
                ? "password"
                : "none"
            }
            importantForAutofill={
              rememberPassword
                ? "yes"
                : "no"
            }
          />

          <Pressable
            onPress={() =>
              setShowPassword(
                (current) =>
                  !current
              )
            }
            style={styles.eyeBtn}
            hitSlop={8}
          >
            <Ionicons
              name={
                showPassword
                  ? "eye-off-outline"
                  : "eye-outline"
              }
              size={23}
              color="#6E6964"
            />
          </Pressable>
        </View>

        {/* Remember password */}
        <Pressable
          onPress={() =>
            setRememberPassword(
              (current) =>
                !current
            )
          }
          style={styles.rememberRow}
          hitSlop={6}
        >
          <View
            style={[
              styles.checkbox,
              rememberPassword &&
                styles.checkboxChecked,
            ]}
          >
            {rememberPassword ? (
              <Ionicons
                name="checkmark"
                size={17}
                color="#FFFFFF"
              />
            ) : null}
          </View>

          <View
            style={styles.rememberCopy}
          >
            <Text
              style={
                styles.rememberTitle
              }
            >
             Se souvenir de moi
            </Text>

            {/* <Text
              style={
                styles.rememberDescription
              }
            >
              Utiliser le gestionnaire de mots de passe sécurisé de votre appareil.
            </Text> */}
          </View>
        </Pressable>

        {/* Session information */}
        {/* <View style={styles.sessionBox}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color="#6E6964"
          />

          <Text
            style={
              styles.sessionInfo
            }
          >
            Votre session restera connectée sur cet appareil, même si vous choisissez de ne pas enregistrer votre mot de passe.
          </Text>
        </View> */}

        {/* Error */}
        {error ? (
          <View
            style={styles.errorBox}
          >
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* Login button */}
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,

            !canSubmit &&
              styles.buttonDisabled,

            pressed &&
              canSubmit &&
              styles.buttonPressed,
          ]}
        >
          {loading ? (
            <View
              style={
                styles.loadingRow
              }
            >
              <ActivityIndicator
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.buttonText
                }
              >
                Connexion...
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.buttonText
              }
            >
              Se connecter
            </Text>
          )}
        </Pressable>

        {/* Registration */}
        <Pressable
          onPress={() =>
            router.push(
              "/(tabs)/(auth)/register"
            )
          }
          style={
            styles.registerButton
          }
        >
          <Text
            style={
              styles.registerText
            }
          >
            Vous n’avez pas de compte ?{" "}
            <Text
              style={
                styles.registerBold
              }
            >
              S'inscrire
            </Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FBF8F4",
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
  },

  title: {
    fontSize: 34,
    lineHeight: 43,
    fontWeight: "900",
    color: "#3F3B37",
    textAlign: "center",
    marginBottom: 46,
    paddingHorizontal: 12,
  },

  label: {
    marginTop: 16,
    marginBottom: 8,
    color: "rgba(63,59,55,0.75)",
    fontSize: 16,
    fontWeight: "800",
  },

  input: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    color: "#3F3B37",
    fontSize: 15,
  },

  passwordWrap: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    color: "#3F3B37",
    fontSize: 15,
  },

  eyeBtn: {
    width: 52,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  rememberRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor:
      "rgba(63,59,55,0.35)",
    backgroundColor:
      "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  checkboxChecked: {
    backgroundColor:
      "#3F3B37",
    borderColor:
      "#3F3B37",
  },

  rememberCopy: {
    flex: 1,
    marginLeft: 10,
  },

  rememberTitle: {
    color: "#3F3B37",
    fontSize: 14,
    fontWeight: "800",
  },

  rememberDescription: {
    marginTop: 3,
    color:
      "rgba(63,59,55,0.52)",
    fontSize: 11,
    lineHeight: 16,
  },

  sessionBox: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor:
      "rgba(63,59,55,0.04)",
  },

  sessionInfo: {
    flex: 1,
    color:
      "rgba(63,59,55,0.58)",
    fontSize: 11,
    lineHeight: 16,
  },

  errorBox: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FCECEA",
  },

  errorText: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  button: {
    marginTop: 22,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#3F3B37",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonDisabled: {
    backgroundColor: "#E4E2DF",
  },

  buttonPressed: {
    opacity: 0.82,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  registerButton: {
    marginTop: 20,
    paddingVertical: 10,
  },

  registerText: {
    textAlign: "center",
    color: "#171717",
    fontSize: 15,
  },

  registerBold: {
    fontWeight: "900",
  },
});