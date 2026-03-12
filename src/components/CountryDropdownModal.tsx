import React, { useMemo, useState } from "react";
import { Modal, View, Text, TextInput, FlatList, Pressable, StyleSheet } from "react-native";

type Item = { name: string; code: string; dial_code: string };

export default function CountryDropdownModal({
  visible,
  title,
  items,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  items: Item[];
  onClose: () => void;
  onSelect: (c: Item) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) =>
      c.name.toLowerCase().includes(s) ||
      c.code.toLowerCase().includes(s) ||
      c.dial_code.includes(s)
    );
  }, [q, items]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={st.wrap}>
        <View style={st.header}>
          <Text style={st.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={st.close}>✕</Text>
          </Pressable>
        </View>

        <View style={st.searchWrap}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Rechercher..."
            style={st.search}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(it) => it.code}
          renderItem={({ item }) => (
            <Pressable
              style={st.row}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text style={st.rowName} numberOfLines={1}>{item.name}</Text>
              <Text style={st.rowDial}>{item.dial_code}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#F7F1EA" },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  title: { fontSize: 16, fontWeight: "900", color: "#3F3B37" },
  close: { fontSize: 18, fontWeight: "900", color: "#3F3B37" },

  searchWrap: { padding: 12 },
  search: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",
  },

  row: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  rowName: { flex: 1, fontSize: 14, fontWeight: "800", color: "#3F3B37" },
  rowDial: { fontSize: 14, fontWeight: "900", color: "rgba(63,59,55,0.7)" },
});
