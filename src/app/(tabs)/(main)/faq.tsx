import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const FAQ_ITEMS = [
  {
    id: "about",
    question: "Qu’est-ce que BeautySafe ?",
    answer:
      "BeautySafe est une application qui vous aide à mieux comprendre les produits de beauté, à consulter leur analyse et à retrouver ceux qui correspondent à vos besoins.",
  },
  {
    id: "scan",
    question: "Comment scanner un produit ?",
    answer:
      "Depuis l’accueil, appuyez sur « Scanner maintenant », autorisez l’accès à la caméra puis placez le code-barres dans le cadre. Vous pouvez aussi saisir le code EAN manuellement.",
  },
  {
    id: "score",
    question: "Comment le score d’un produit est-il calculé ?",
    answer:
      "Le score est établi à partir des informations disponibles sur le produit et de l’analyse de sa composition selon les critères BeautySafe. Il constitue un repère et ne remplace pas l’avis d’un professionnel de santé.",
  },
  {
    id: "favorites",
    question: "Comment ajouter un produit à mes favoris ?",
    answer:
      "Ouvrez la fiche du produit puis appuyez sur l’icône en forme de cœur. Vous devez être connecté pour enregistrer et retrouver vos favoris.",
  },
  {
    id: "not-found",
    question: "Pourquoi un produit est-il introuvable ?",
    answer:
      "Le code-barres peut être illisible, incorrect ou ne pas encore figurer dans la base BeautySafe. Vérifiez le code, essayez la saisie manuelle ou contactez notre équipe.",
  },
  {
    id: "privacy",
    question: "Mes données personnelles sont-elles protégées ?",
    answer:
      "BeautySafe accorde une grande importance à la protection de vos données. Pour connaître les informations collectées, leur utilisation et vos droits, consultez la Politique de confidentialité depuis l’accueil.",
  },
  {
    id: "profile",
    question: "Comment modifier mon profil beauté ?",
    answer:
      "Ouvrez l’onglet Profil, puis choisissez l’action de modification. Vous pourrez mettre à jour vos informations ainsi que votre type de peau et votre type de cheveux.",
  },
  {
    id: "contact",
    question: "Comment contacter l’équipe BeautySafe ?",
    answer:
      "Utilisez la rubrique « Contactez-nous » depuis l’accueil ou le bouton situé en bas de cette page pour accéder au formulaire de contact BeautySafe.",
  },
] as const;

export default function FaqScreen() {
  const router = useRouter();
  const [openItemId, setOpenItemId] = useState<string | null>(
    FAQ_ITEMS[0].id,
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/(main)");
  };

  const toggleItem = (itemId: string) => {
    setOpenItemId((currentId) =>
      currentId === itemId ? null : itemId,
    );
  };

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir en arrière"
          hitSlop={8}
          onPress={handleBack}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color="#203A42" />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Questions fréquentes
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Retrouvez les réponses aux questions les plus courantes sur BeautySafe.
        </Text>

        <View style={styles.accordionList}>
          {FAQ_ITEMS.map((item) => {
            const isOpen = openItemId === item.id;

            return (
              <View key={item.id} style={styles.accordionCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  onPress={() => toggleItem(item.id)}
                  style={styles.questionRow}
                >
                  <Text style={styles.questionText}>{item.question}</Text>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={21}
                    color="#687C79"
                  />
                </Pressable>

                {isOpen ? (
                  <View style={styles.answerWrap}>
                    <Text style={styles.answerText}>{item.answer}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/(main)/contact")}
          style={styles.contactButton}
        >
          <Ionicons name="mail-outline" size={20} color="#687C79" />
          <Text style={styles.contactButtonText}>Contactez-nous</Text>
          <Ionicons name="chevron-forward" size={19} color="#687C79" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FBF8F4",
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#FBF8F4",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(32,58,66,0.05)",
  },
  headerTitle: {
    flex: 1,
    color: "#203A42",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 48,
  },
  intro: {
    paddingHorizontal: 8,
    color: "#7D8382",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  accordionList: {
    gap: 11,
  },
  accordionCard: {
    overflow: "hidden",
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(32,58,66,0.06)",
  },
  questionRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  questionText: {
    flex: 1,
    flexShrink: 1,
    color: "#203A42",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
  },
  answerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  answerText: {
    color: "#737A79",
    fontSize: 13,
    lineHeight: 20,
  },
  contactButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: "#E4F0EB",
  },
  contactButtonText: {
    color: "#3F3B37",
    fontSize: 14,
    fontWeight: "900",
  },
});
