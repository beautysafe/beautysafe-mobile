import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, KeyboardAvoidingView, ScrollView} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import COUNTRIES from "../../../constants/countries.json";
import CountryDropdownModal from "../../../components/CountryDropdownModal";
import { HAIR_TYPES, SKIN_TYPES } from "../../../constants/profileOptions";
import { SelectField } from "../../../components/SelectField";
import { register as registerApi, login as loginApi  } from "../../../api/authApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateMe } from "../../../api/usersApi";
import { TOKEN_KEY } from "../../../api/clientApi";
import { router } from "expo-router";
// import { useAuth } from "../../../hooks/useAuth";
import { useAuth } from "../../../components/AuthProvider";

type CountryItem = { name: string; code: string; dial_code: string };


export default function RegisterScreen() {
  const countries = COUNTRIES as CountryItem[];
  const [country, setCountry] = useState<CountryItem>(
    countries.find((c) => c.code === "FR") || countries[0]
  );
  const [phoneCountry, setPhoneCountry] = useState<CountryItem>(
    countries.find((c) => c.code === "FR") || countries[0]
  );
  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, refreshMe } = useAuth();

  // Profile
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null); // Date | null
  const [showDate, setShowDate] = useState(false);

  const [skinType, setSkinType] = useState("");
  const [hairType, setHairType] = useState("");


  const [phoneLocal, setPhoneLocal] = useState("");
  const phoneNumber = useMemo(() => {
    const dial = phoneCountry?.dial_code || "";
    return `${dial}${phoneLocal}`.replace(/\s+/g, "");
  }, [phoneCountry, phoneLocal]);
  const [openCountry, setOpenCountry] = useState(false);
  const [openDial, setOpenDial] = useState(false);
  const [address, setAddress] = useState("");

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
 // uri string
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarKey, setAvatarKey] = useState("");

  const pickBirthday = () => setShowDate(true);

  const onChangeBirthday = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDate(false);
    if (event.type === "set" && selectedDate) setBirthday(selectedDate);
  };
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (res.canceled) return;

    const uri = res.assets?.[0]?.uri;
    if (!uri) return;

    setAvatarPreview(uri);

    setAvatarUrl("https://example.com/avatar.jpg");
    setAvatarKey("avatars/user-xxx.jpg");
  };

 
  const submit = async () => {
    try {
      await registerApi({ email, password });
  
      await signIn(email, password);
  
      await updateMe({
        fullName,
        birthday: birthday ? birthday.toISOString().slice(0, 10) : undefined,
        skinType,
        hairType,
        address,
        phoneNumber,
        avatarUrl: avatarUrl || undefined,
        avatarKey: avatarKey || undefined,
      });
  
      await refreshMe();
  
      router.replace("/(tabs)/(main)/profile"); // or "/(tabs)/profile" depending on your actual file
    } catch (err) {
      console.log("Register flow failed:", err);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F7F1EA" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>S'inscrire</Text>

        {/* Avatar */}
        {/* <Pressable style={styles.avatarBox} onPress={pickAvatar}>
          {avatarPreview ? (
            <Image source={{ uri: avatarPreview }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Text style={styles.avatarText}>Ajouter une photo</Text>
          )}
        </Pressable> */}

        <Text style={styles.label}>Nom complet</Text>
        <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Saisissez votre nom complet " />

        
        {/* Birthday */}
        <Text style={styles.label}>Date de naissance</Text>
        <Pressable style={styles.pickerBtn} onPress={pickBirthday}>
          <Text style={styles.pickerText}>
            {birthday ? birthday.toISOString().slice(0, 10) : "Sélectionnez votre date de naissance"}
          </Text>
        </Pressable>

        {showDate && (
          <DateTimePicker
            value={birthday || new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={onChangeBirthday}
          />
        )}

      {/* Phone */}
      <Text style={styles.label}>N° de téléphone</Text>
        <View style={styles.phoneRow}>
          <Pressable style={styles.dialBtn} onPress={() => setOpenDial(true)}>
            <Text style={styles.dialText}>{phoneCountry.dial_code}</Text>
            <Text style={styles.chev}>⌄</Text>
          </Pressable>

          <TextInput
            value={phoneLocal}
            onChangeText={setPhoneLocal}
            style={styles.phoneInput}
            placeholder="Saisissez votre numéro de téléphone"
            keyboardType="phone-pad"
          />
        </View>

      {/* Country */}
      <Text style={styles.label}>Pays de résidence</Text>
      <Pressable style={styles.selectRow} onPress={() => setOpenCountry(true)}>
        <Text style={styles.selectText} numberOfLines={1}>
          {country?.name || "Sélectionnez votre pays de résidence"}
        </Text>
        <Text style={styles.selectChevron}>⌄</Text>
      </Pressable>

      {/* Modals */}
      <CountryDropdownModal
        visible={openDial}
        title="Indicatif"
        items={countries}
        onClose={() => setOpenDial(false)}
        onSelect={(c) => setPhoneCountry(c)}
      />

      <CountryDropdownModal
        visible={openCountry}
        title="Pays de résidence"
        items={countries}
        onClose={() => setOpenCountry(false)}
        onSelect={(c) => setCountry(c)}
      />

      {/* Debug */}
      {/* <Text>{phoneNumber}</Text> */}
          
        {/* Skin/Hair */}
        <SelectField
            label="Type de peau"
            value={skinType}
            onChange={setSkinType}
            options={SKIN_TYPES}
            />

            <SelectField
            label="Type de cheveux"
            value={hairType}
            onChange={setHairType}
            options={HAIR_TYPES}
            />        

        <Text style={styles.label}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" keyboardType="email-address"  placeholder="example@mail.com" />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput value={password} onChangeText={setPassword} style={styles.input}  placeholder="******* " secureTextEntry />

        <Pressable style={styles.submit} onPress={submit}>
          <Text style={styles.submitText}>S’inscrire</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 40, gap: 10, paddingTop: 34 },
  title: { fontSize: 28, fontWeight: "900", color: "#3F3B37", marginBottom: 6, alignContent: "center" },

  label: { fontSize: 13, fontWeight: "800", color: "rgba(63,59,55,0.75)",},

  input: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",
    color: "#3F3B37",
  },

  pickerBtn: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    // alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",
  },
  pickerText: { fontSize: 14, fontWeight: "700", color: "rgba(63, 59, 55, 0.56)" },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",
  },
  chipOn: { backgroundColor: "#3F3B37" },
  chipText: { fontSize: 12, fontWeight: "800", color: "rgba(63,59,55,0.75)" },
  chipTextOn: { color: "#fff" },

  phoneCode: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",
  },
  phoneCodeText: { fontSize: 14, fontWeight: "800", color: "#3F3B37" },

  avatarBox: {
    alignSelf: "center",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 2,
    borderColor: "rgba(63,59,55,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 10,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { fontSize: 13, fontWeight: "800", color: "rgba(63,59,55,0.7)" },

  submit: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#3F3B37",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  phoneRow: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },

  dialBtn: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dialText: { fontSize: 14, fontWeight: "900", color: "#3F3B37" },
  chev: { fontSize: 14, color: "rgba(63,59,55,0.55)" },

  phoneInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    fontWeight: "700",
    color: "#3F3B37",
  },

  selectRow: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(63,59,55,0.12)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  selectText: { flex: 1, fontSize: 14, fontWeight: "700", color: "rgba(63,59,55,0.55)" },
  selectChevron: { fontSize: 16, color: "rgba(63,59,55,0.55)" },
});
