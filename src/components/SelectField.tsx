import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
};

export function SelectField({ label, value, onChange, options }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={value}
          onValueChange={onChange}
          style={styles.picker}
        >
          <Picker.Item label="Sélectionner..." value="" />
          {options.map((opt) => (
            <Picker.Item key={opt} label={opt} value={opt} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 5 },
  label: { fontSize: 13, fontWeight: "800", color: "rgba(63,59,55,0.75)",},

  pickerWrap: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",
    color: "#3F3B37",
  },

  picker: {
    height: 54,
  },
});