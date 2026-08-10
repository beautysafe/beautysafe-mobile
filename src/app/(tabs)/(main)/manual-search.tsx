import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ManualSearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [ean, setEan] = useState("");

  const cleanedEan = useMemo(() => ean.replace(/\D/g, ""), [ean]);
  const isValidLength = cleanedEan.length === 8 || cleanedEan.length === 13;
  const canSearch = isValidLength;

  const handleChange = (value: string) => {
    setEan(value.replace(/\D/g, ""));
  };

  const goToProduct = (eanCode: string) => {
    router.push({
      pathname: "/product/[ean]",
      params: { ean: eanCode, fromEanSearch: "true" },
    });
  };

  const handleSearch = () => {
    const trimmed = cleanedEan.trim();

    if (!trimmed) {
      Alert.alert("Champ requis", "Veuillez saisir un code-barres.");
      return;
    }

    if (trimmed.length !== 8 && trimmed.length !== 13) {
      Alert.alert(
        "Code-barres invalide",
        "Le code-barres doit contenir 8 ou 13 chiffres."
      );
      return;
    }

    Keyboard.dismiss();
    inputRef.current?.blur();

    goToProduct(trimmed);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={26} color="#5F5F5F" />
          </TouchableOpacity>

          <Text style={styles.title}>Rechercher un produit manuellement</Text>

          <Text style={styles.subtitle}>
            Si le scan automatique ne fonctionne pas, vous pouvez rechercher le
            produit en saisissant son code-barres.
          </Text>

          <View style={styles.formBlock}>
            <Text style={styles.label}>Le code-barres (EAN)</Text>

            <TextInput
              ref={inputRef}
              value={ean}
              onChangeText={handleChange}
              placeholder="3264680010535"
              placeholderTextColor="#C7C7C7"
              keyboardType="number-pad"
              maxLength={13}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />

            <TouchableOpacity
              style={[
                styles.searchButton,
                !canSearch && styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              activeOpacity={0.85}
              disabled={!cleanedEan.length}
            >
              <Text
                style={[
                  styles.searchButtonText,
                  !canSearch && styles.searchButtonTextDisabled,
                ]}
              >
                Rechercher le produit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F6F2EC",
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 70,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    color: "#5A5A5A",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 22,
    fontSize: 16,
    lineHeight: 26,
    color: "#6A6A6A",
    textAlign: "center",
    paddingHorizontal: 6,
  },
  formBlock: {
    marginTop: 52,
  },
  label: {
    fontSize: 16,
    color: "#7A7A7A",
    marginBottom: 12,
  },
  input: {
    height: 92,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    fontSize: 22,
    color: "#5A5A5A",
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },
  searchButton: {
    height: 76,
    marginTop: 28,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#5A5A5A",
  },
  searchButtonTextDisabled: {
    color: "#888888",
  },
});
