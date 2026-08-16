import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
};

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Sélectionner...",
}: Props) {
  const [visible, setVisible] = useState(false);

  const selectOption = (option: string) => {
    onChange(option);
    setVisible(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.field,
          pressed && styles.fieldPressed,
        ]}
      >
        <Text
          style={[
            styles.fieldText,
            !value && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>

        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {label}
              </Text>

              <Pressable
                onPress={() => setVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.optionsScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
            >
              {options.map((option) => {
                const selected = option === value;

                return (
                  <Pressable
                    key={option}
                    onPress={() => selectOption(option)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>

                    {selected ? (
                      <Text style={styles.check}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 5,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(63,59,55,0.75)",
    marginBottom: 10,
  },

  field: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 14,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",

    flexDirection: "row",
    alignItems: "center",
  },

  fieldPressed: {
    opacity: 0.8,
  },

  fieldText: {
    flex: 1,
    color: "#3F3B37",
    fontSize: 14,
    fontWeight: "700",
  },

  placeholderText: {
    color: "#96908A",
  },

  chevron: {
    marginLeft: 10,
    color: "#77716B",
    fontSize: 18,
  },

  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  modalCard: {
    width: "100%",
    maxHeight: "70%",

    backgroundColor: "#FFFFFF",

    borderRadius: 22,
    overflow: "hidden",

    padding: 16,

    elevation: 12,

    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 10,
  },

  modalTitle: {
    flex: 1,
    color: "#3F3B37",
    fontSize: 20,
    fontWeight: "900",
  },

  closeButton: {
    width: 40,
    height: 40,

    borderRadius: 20,

    backgroundColor: "#F5F2EE",

    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    color: "#3F3B37",
    fontSize: 16,
    fontWeight: "800",
  },

  optionsScroll: {
    maxHeight: 430,
  },

  option: {
    minHeight: 54,

    borderRadius: 14,

    paddingHorizontal: 14,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 6,

    backgroundColor: "#F8F6F3",
  },

  optionPressed: {
    opacity: 0.75,
  },

  optionSelected: {
    backgroundColor: "#E9F7F2",
  },

  optionText: {
    flex: 1,

    color: "#3F3B37",

    fontSize: 16,
    fontWeight: "700",
  },

  optionTextSelected: {
    fontWeight: "900",
  },

  check: {
    color: "#65AFA1",
    fontSize: 20,
    fontWeight: "900",
  },
});