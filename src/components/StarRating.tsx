import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

type StarRatingProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export default function StarRating({
  value,
  onChange,
  disabled = false,
  accessibilityLabel = "Note",
}: StarRatingProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }, (_, index) => {
        const rating = index + 1;
        const active = rating <= value;

        return (
          <Pressable
            key={rating}
            style={styles.starButton}
            onPress={() => onChange(rating)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityLabel} : ${rating} sur 5`}
            accessibilityState={{ selected: active, disabled }}
          >
            <Ionicons
              name={active ? "star" : "star-outline"}
              size={32}
              color={active ? "#D39A37" : "#9C9A96"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
});
