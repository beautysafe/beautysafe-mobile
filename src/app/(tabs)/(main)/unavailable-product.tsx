import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../components/AuthProvider";
import type { UnavailableProductImageFile } from "../../../api/unavailableProductsApi";
import {
  UnavailableImageUploadError,
  useUnavailableProducts,
} from "../../../hooks/useUnavailableProducts";

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

type SelectedImage = {
  id: string;
  asset: ImagePicker.ImagePickerAsset;
};

function createSelectedImage(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
): SelectedImage {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    asset,
  };
}

function getUploadFile(
  selectedImage: SelectedImage,
  index: number,
): UnavailableProductImageFile {
  const { asset } = selectedImage;
  const uriName = asset.uri.split("?")[0].split("/").pop();
  const name = asset.fileName?.trim() || uriName || `photo-${index + 1}.jpg`;

  return {
    uri: asset.uri,
    name,
    type: asset.mimeType || "image/jpeg",
  };
}

function getSubmissionErrorMessage(error: unknown) {
  const status = (error as { status?: number })?.status;
  const imageNumber =
    error instanceof UnavailableImageUploadError ? error.imageNumber : null;

  if (status === 413) {
    return "Cette image est trop volumineuse. Taille maximale : 10 Mo.";
  }

  if (status === 400) {
    return imageNumber
      ? `La photo ${imageNumber} n’est pas valide. Retirez-la ou choisissez-en une autre, puis réessayez.`
      : "Les informations envoyées ne sont pas valides. Vérifiez les photos puis réessayez.";
  }

  if (imageNumber) {
    return `La photo ${imageNumber} n’a pas pu être envoyée. Vérifiez votre connexion puis réessayez.`;
  }

  return "L’envoi a échoué. Vérifiez votre connexion puis réessayez.";
}

export default function UnavailableProductScreen() {
  const router = useRouter();
  const { ean } = useLocalSearchParams<{ ean?: string }>();
  const scannedEan = typeof ean === "string" && ean.trim() ? ean.trim() : undefined;
  const { token } = useAuth();
  const {
    submitUnavailableProduct,
    isSubmitting,
    reset: resetSubmission,
  } = useUnavailableProducts();
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const oversized = assets.some(
      (asset) =>
        typeof asset.fileSize === "number" &&
        asset.fileSize > MAX_IMAGE_SIZE_BYTES,
    );

    if (oversized) {
      Alert.alert(
        "Image trop volumineuse",
        "Cette image est trop volumineuse. Taille maximale : 10 Mo.",
      );
      return;
    }

    setErrorMessage(null);
    resetSubmission();
    setImages((current) => {
      const availableSlots = MAX_IMAGES - current.length;
      return [
        ...current,
        ...assets
          .slice(0, availableSlots)
          .map((asset, index) => createSelectedImage(asset, index)),
      ];
    });
  };

  const selectFromGallery = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Maximum atteint", "Vous pouvez envoyer jusqu’à 10 photos.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Autorisation nécessaire",
        "Autorisez l’accès à vos photos pour sélectionner les images du produit.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.9,
    });

    if (!result.canceled) {
      addAssets(result.assets);
    }
  };

  const takePhoto = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Maximum atteint", "Vous pouvez envoyer jusqu’à 10 photos.");
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Autorisation nécessaire",
        "Autorisez l’accès à la caméra pour prendre une photo du produit.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });

    if (!result.canceled) {
      addAssets(result.assets);
    }
  };

  const removeImage = (id: string) => {
    setImages((current) => current.filter((image) => image.id !== id));
    setErrorMessage(null);
    resetSubmission();
  };

  const handleSubmit = async () => {
    if (!token) {
      router.push("/(tabs)/(auth)/login");
      return;
    }

    if (!images.length) {
      setErrorMessage("Ajoutez au moins une photo avant l’envoi.");
      return;
    }

    setErrorMessage(null);

    try {
      await submitUnavailableProduct({
        ean: scannedEan,
        notes,
        images: images.map(getUploadFile),
      });
      setSubmitted(true);
    } catch (submissionError: unknown) {
      if ((submissionError as { status?: number })?.status === 401) {
        router.push("/(tabs)/(auth)/login");
        return;
      }

      setErrorMessage(getSubmissionErrorMessage(submissionError));
    }
  };

  if (submitted) {
    return (
      <View style={styles.successPage}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={42} color="#3F3B37" />
        </View>
        <Text style={styles.successTitle}>Merci !</Text>
        <Text style={styles.successText}>
          Les photos ont été envoyées.{"\n"}Notre équipe pourra ajouter ce
          produit prochainement.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/(tabs)/(main)")}
        >
          <Text style={styles.primaryButtonText}>Retour à l&apos;accueil</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={25} color="#3F3B37" />
          </Pressable>
          <View style={styles.topBarSpacer} />
        </View>

        <Text style={styles.title}>Produit introuvable</Text>
        <Text style={styles.description}>
          Envoyez-nous quelques photos du produit afin que nous puissions
          l&apos;ajouter prochainement à BeautySafe.
        </Text>

        {scannedEan ? (
          <View style={styles.eanPill}>
            <Ionicons name="barcode-outline" size={20} color="#3F3B37" />
            <Text selectable style={styles.eanText}>
              Code-barres : {scannedEan}
            </Text>
          </View>
        ) : null}

        <View style={styles.imageSection}>
          <View style={styles.imageSectionHeader}>
            <Text style={styles.sectionTitle}>Photos du produit</Text>
            <Text style={styles.imageCounter}>{images.length} / 10 photos</Text>
          </View>

          <Pressable
            style={styles.addPhotosButton}
            onPress={() => void selectFromGallery()}
            disabled={isSubmitting}
          >
            <Ionicons name="images-outline" size={22} color="#3F3B37" />
            <Text style={styles.addPhotosText}>Ajouter des photos</Text>
          </Pressable>

          <Pressable
            style={styles.cameraButton}
            onPress={() => void takePhoto()}
            disabled={isSubmitting}
          >
            <Ionicons name="camera-outline" size={20} color="#687C79" />
            <Text style={styles.cameraButtonText}>Prendre une photo</Text>
          </Pressable>

          {images.length ? (
            <View style={styles.imageGrid}>
              {images.map((selectedImage) => (
                <View key={selectedImage.id} style={styles.thumbnailWrap}>
                  <Image
                    source={{ uri: selectedImage.asset.uri }}
                    style={styles.thumbnail}
                    contentFit="cover"
                  />
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removeImage(selectedImage.id)}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Retirer cette photo"
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.imageHelp}>
              Ajoutez entre 1 et 10 photos. Chaque image doit faire moins de 10
              Mo.
            </Text>
          )}
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.inputLabel}>
            Information supplémentaire (facultatif)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            editable={!isSubmitting}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            placeholder="Ajoutez un détail utile sur le produit..."
            placeholderTextColor="rgba(63,59,55,0.42)"
            style={styles.notesInput}
          />
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={21} color="#A55B69" />
            <Text selectable style={styles.errorText}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.primaryButton,
            (!images.length || isSubmitting) && styles.primaryButtonDisabled,
          ]}
          onPress={() => void handleSubmit()}
          disabled={!images.length || isSubmitting}
        >
          {isSubmitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Envoi en cours...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Envoyer le produit</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FBF8F4",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 48,
    gap: 18,
  },
  topBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  topBarSpacer: {
    width: 44,
  },
  title: {
    color: "#3F3B37",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    color: "#69716F",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  eanPill: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#DFF1EA",
  },
  eanText: {
    color: "#3F3B37",
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  imageSection: {
    padding: 16,
    borderRadius: 22,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  imageSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    color: "#3F3B37",
    fontSize: 18,
    fontWeight: "900",
  },
  imageCounter: {
    color: "#69716F",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  addPhotosButton: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#DFF1EA",
  },
  addPhotosText: {
    color: "#3F3B37",
    fontSize: 15,
    fontWeight: "900",
  },
  cameraButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cameraButtonText: {
    color: "#687C79",
    fontSize: 14,
    fontWeight: "800",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  thumbnailWrap: {
    width: "30.5%",
    aspectRatio: 1,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#F7F1EA",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(63,59,55,0.82)",
  },
  imageHelp: {
    color: "#7D8382",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  notesSection: {
    gap: 9,
  },
  inputLabel: {
    color: "#3F3B37",
    fontSize: 15,
    fontWeight: "800",
  },
  notesInput: {
    minHeight: 126,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.1)",
    paddingHorizontal: 15,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    color: "#3F3B37",
    fontSize: 15,
    lineHeight: 21,
  },
  errorCard: {
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#FBEAEC",
  },
  errorText: {
    flex: 1,
    color: "#8F4553",
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 17,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3F3B37",
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  submittingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  successPage: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#FBF8F4",
  },
  successIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DFF1EA",
  },
  successTitle: {
    color: "#3F3B37",
    fontSize: 34,
    fontWeight: "900",
  },
  successText: {
    color: "#69716F",
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
  },
});
