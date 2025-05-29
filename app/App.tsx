import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Camera, CameraView, BarcodeType } from "expo-camera";

const API_BASE_URL = "https://beauty-safe-monorepo.onrender.com";

type Ingredient = {
  official_name?: string;
  name?: string;
  score?: number;
};

type Composition = {
  ingredients?: Ingredient[];
};

type Product = {
  name?: string;
  brand?: string;
  images?: { image?: string };
  score?: number;
  validation_score?: number;
  eans?: string[];
  categories?: { [key: string]: string };
  compositions?: Composition[];
};

export default function ProductByEanScreen() {
  const [ean, setEan] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [scanned, setScanned] = useState(false);

  // Camera permission
  useEffect(() => {
    if (showScanner && hasCameraPermission === null) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasCameraPermission(status === "granted");
      })();
    }
    // Reset scan state on each scanner open
    if (showScanner) setScanned(false);
  }, [showScanner, hasCameraPermission]);

  const fetchProduct = async (searchEan = ean) => {
    setError("");
    setLoading(true);
    setProduct(null);
    try {
      const res = await fetch(`${API_BASE_URL}/products/ean/${searchEan}`);
      if (!res.ok) throw new Error("Produit non trouvé");
      const data: Product = await res.json();
      setProduct(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!scanned) {
      setScanned(true);
      setShowScanner(false);
      setEan(data);
      fetchProduct(data);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Recherche produit par EAN</Text>
      <TextInput
        value={ean}
        onChangeText={setEan}
        placeholder="Entrer le code EAN"
        keyboardType="numeric"
        style={styles.input}
      />
      <View
        style={{
          flexDirection: "row",
          width: "100%",
          maxWidth: 350,
          marginBottom: 10,
        }}
      >
        <Button
          title="Rechercher"
          onPress={() => fetchProduct()}
          disabled={!ean || loading}
        />
        <View style={{ width: 12 }} />
        <Button
          title="Scanner un code-barres"
          onPress={() => setShowScanner(true)}
        />
      </View>

      {/* Modal for camera barcode scanner */}
      <Modal visible={showScanner} animationType="slide">
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          {hasCameraPermission === null ? (
            <Text>Demande de permission à la caméra...</Text>
          ) : hasCameraPermission === false ? (
            <Text style={{ color: "red", margin: 18 }}>Permission refusée</Text>
          ) : (
            <CameraView
              style={{ width: 320, height: 380 }}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
              }}
            />
          )}
          <TouchableOpacity
            onPress={() => setShowScanner(false)}
            style={{ marginTop: 22 }}
          >
            <Text style={{ color: "#3182ce", fontSize: 16 }}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {loading && <ActivityIndicator style={{ margin: 20 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {product && (
        <View style={styles.card}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.brand}>{product.brand}</Text>
          {product.images?.image && (
            <Image
              source={{ uri: product.images.image }}
              style={styles.image}
              resizeMode="contain"
            />
          )}
          <Text style={styles.label}>
            Score: <Text style={styles.value}>{product.score}</Text>
          </Text>
          <Text style={styles.label}>
            Validation:{" "}
            <Text style={styles.value}>{product.validation_score}</Text>
          </Text>
          <Text style={styles.label}>
            EAN: <Text style={styles.value}>{product.eans?.join(", ")}</Text>
          </Text>
          {/* Categories */}
          <Text style={styles.label}>Catégories:</Text>
          <Text style={styles.value}>
            {product.categories &&
              Object.values(product.categories).join(" > ")}
          </Text>
          {/* Ingredients */}
          <Text style={styles.label}>Ingrédients:</Text>
          {product.compositions && product.compositions.length > 0 ? (
            product.compositions.map((comp, idx) => (
              <View key={idx}>
                {comp.ingredients &&
                  comp.ingredients.map((ing, j) => (
                    <Text key={j} style={styles.ingredient}>
                      {ing.official_name || ing.name}{" "}
                      {ing.score !== undefined ? `(Score: ${ing.score})` : ""}
                    </Text>
                  ))}
              </View>
            ))
          ) : (
            <Text style={styles.value}>N/A</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
    flexGrow: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 10,
    marginVertical: 12,
    width: "100%",
    maxWidth: 350,
    fontSize: 17,
  },
  error: {
    color: "red",
    margin: 10,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 18,
    marginTop: 22,
    width: "100%",
    maxWidth: 390,
    shadowColor: "#aaa",
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  productName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
    color: "#191c23",
  },
  brand: {
    fontSize: 15,
    color: "#686868",
    marginBottom: 7,
  },
  label: {
    fontWeight: "bold",
    marginTop: 8,
    fontSize: 15,
    color: "#444",
  },
  value: {
    fontWeight: "normal",
    color: "#333",
    fontSize: 15,
  },
  image: {
    width: 150,
    height: 150,
    alignSelf: "center",
    borderRadius: 8,
    marginVertical: 14,
  },
  ingredient: {
    fontSize: 14,
    marginLeft: 10,
    marginBottom: 2,
    color: "#57534e",
  },
});
