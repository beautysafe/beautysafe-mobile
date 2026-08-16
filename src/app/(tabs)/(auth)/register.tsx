import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { router } from "expo-router";

import COUNTRIES from "../../../constants/countries.json";
import CountryDropdownModal from "../../../components/CountryDropdownModal";

import {
  HAIR_TYPES,
  SKIN_TYPES,
} from "../../../constants/profileOptions";

import { SelectField } from "../../../components/SelectField";

import { register as registerApi } from "../../../api/authApi";
import { updateMe } from "../../../api/usersApi";
import { useAuth } from "../../../components/AuthProvider";

type CountryItem = {
  name: string;
  code: string;
  dial_code: string;
};

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

export default function RegisterScreen() {
  const countries =
    COUNTRIES as CountryItem[];

  const defaultCountry =
    countries.find(
      (country) => country.code === "FR"
    ) || countries[0];

  /*
   * Authentication
   */
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState("");

  /*
   * Name
   */
  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  /*
   * Birthday
   */
  const [birthday, setBirthday] =
    useState<Date | null>(null);

  const [showDate, setShowDate] =
    useState(false);

  /*
   * Profile preferences
   */
  const [skinType, setSkinType] =
    useState("");

  const [hairType, setHairType] =
    useState("");

  /*
   * Phone
   */
  const [
    phoneCountry,
    setPhoneCountry,
  ] =
    useState<CountryItem>(
      defaultCountry
    );

  const [phoneLocal, setPhoneLocal] =
    useState("");

  /*
   * Residence country
   */
  const [country, setCountry] =
    useState<CountryItem>(
      defaultCountry
    );

  const [
    openCountry,
    setOpenCountry,
  ] = useState(false);

  const [openDial, setOpenDial] =
    useState(false);

  /*
   * Submit state
   */
  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState("");

  const { signIn, refreshMe } =
    useAuth();

  /*
   * Backend still expects one fullName.
   *
   * Example:
   *
   * firstName = "Ilyas"
   * lastName  = "Chenouf"
   *
   * fullName = "Ilyas Chenouf"
   */
  const fullName = useMemo(() => {
    return [
      normalizeName(firstName),
      normalizeName(lastName),
    ]
      .filter(Boolean)
      .join(" ");
  }, [firstName, lastName]);

  const phoneNumber = useMemo(() => {
    const local =
      phoneLocal
        .trim()
        .replace(/\s+/g, "");

    if (!local) {
      return "";
    }

    const dial =
      phoneCountry?.dial_code || "";

    return `${dial}${local}`;
  }, [
    phoneCountry,
    phoneLocal,
  ]);

  const pickBirthday = () => {
    Keyboard.dismiss();
    setShowDate(true);
  };

  const onChangeBirthday = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowDate(false);

    if (
      event.type === "set" &&
      selectedDate
    ) {
      setBirthday(selectedDate);
    }
  };

  const validateForm = () => {
    if (!normalizeName(firstName)) {
      return "Veuillez saisir votre prénom.";
    }

    if (!normalizeName(lastName)) {
      return "Veuillez saisir votre nom.";
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      return "Veuillez saisir votre adresse email.";
    }

    if (!isValidEmail(normalizedEmail)) {
      return "Veuillez saisir une adresse email valide.";
    }

    if (!password) {
      return "Veuillez saisir un mot de passe.";
    }

    if (password.length < 6) {
      return "Le mot de passe doit contenir au moins 6 caractères.";
    }

    if (!passwordConfirmation) {
      return "Veuillez confirmer votre mot de passe.";
    }

    if (
      password !==
      passwordConfirmation
    ) {
      return "Les mots de passe ne correspondent pas.";
    }

    return null;
  };

  const submit = async () => {
    /*
     * Prevent accidental double registration.
     */
    if (isSubmitting) {
      return;
    }

    Keyboard.dismiss();
    setFormError("");

    const validationError =
      validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    try {
      setIsSubmitting(true);

      /*
       * 1. Create authentication account
       */
      await registerApi({
        email: normalizedEmail,
        password,
      });

      /*
       * 2. Login to obtain JWT
       */
      await signIn(
        normalizedEmail,
        password
      );

      /*
       * 3. Update profile.
       *
       * Backend expects fullName,
       * therefore firstName + lastName
       * are combined here.
       */
      await updateMe({
        fullName,

        birthday: birthday
          ? formatLocalDate(birthday)
          : undefined,

        skinType:
          skinType || undefined,

        hairType:
          hairType || undefined,

        /*
         * Do not send "+" with no phone
         * number if user left it empty.
         */
        phoneNumber:
          phoneNumber || undefined,

        /*
         * The current backend exposes
         * `address`, not a dedicated
         * residence-country property.
         *
         * We therefore store the selected
         * residence country in address.
         */
        address:
          country?.name || undefined,
      });

      /*
       * 4. Refresh authenticated user
       */
      await refreshMe();

      /*
       * 5. Continue to profile
       */
      router.replace(
        "/(tabs)/(main)/profile"
      );
    } catch (error) {
      console.log(
        "Register flow failed:",
        error
      );

      let message =
        "Impossible de créer votre compte. Veuillez réessayer.";

      if (error instanceof Error) {
        const backendMessage =
          error.message?.trim();

        if (backendMessage) {
          message = backendMessage;
        }
      }

      setFormError(message);
    } finally {
      setIsSubmitting(false);
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={
          false
        }
        nestedScrollEnabled
      >
        <Text style={styles.title}>
          S'inscrire
        </Text>

        {/* First name */}
        <Text style={styles.label}>
          Prénom
        </Text>

        <TextInput
          value={firstName}
          onChangeText={(value) => {
            setFirstName(value);
            setFormError("");
          }}
          style={styles.input}
          placeholder="Saisissez votre prénom"
          placeholderTextColor="#A29C96"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
        />

        {/* Last name */}
        <Text style={styles.label}>
          Nom
        </Text>

        <TextInput
          value={lastName}
          onChangeText={(value) => {
            setLastName(value);
            setFormError("");
          }}
          style={styles.input}
          placeholder="Saisissez votre nom"
          placeholderTextColor="#A29C96"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
        />

        {/* Birthday */}
        <Text style={styles.label}>
          Date de naissance
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.pickerBtn,
            pressed &&
              styles.pressed,
          ]}
          onPress={pickBirthday}
        >
          <Text
            style={[
              styles.pickerText,
              birthday &&
                styles.selectedPickerText,
            ]}
          >
            {birthday
              ? formatLocalDate(
                  birthday
                )
              : "Sélectionnez votre date de naissance"}
          </Text>
        </Pressable>

        {showDate ? (
          <DateTimePicker
            value={
              birthday ||
              new Date(
                2000,
                0,
                1
              )
            }
            mode="date"
            display={
              Platform.OS === "ios"
                ? "spinner"
                : "default"
            }
            maximumDate={
              new Date()
            }
            onChange={
              onChangeBirthday
            }
          />
        ) : null}

        {/* Phone */}
        <Text style={styles.label}>
          N° de téléphone
        </Text>

        <View style={styles.phoneRow}>
          <Pressable
            style={styles.dialBtn}
            onPress={() => {
              Keyboard.dismiss();
              setOpenDial(true);
            }}
          >
            <Text
              style={
                styles.dialText
              }
            >
              {
                phoneCountry.dial_code
              }
            </Text>

            <Text style={styles.chev}>
              ⌄
            </Text>
          </Pressable>

          <TextInput
            value={phoneLocal}
            onChangeText={
              setPhoneLocal
            }
            style={
              styles.phoneInput
            }
            placeholder="Saisissez votre numéro"
            placeholderTextColor="#A29C96"
            keyboardType="phone-pad"
          />
        </View>

        {/* Residence */}
        <Text style={styles.label}>
          Pays de résidence
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.selectRow,
            pressed &&
              styles.pressed,
          ]}
          onPress={() => {
            Keyboard.dismiss();
            setOpenCountry(true);
          }}
        >
          <Text
            style={
              styles.selectText
            }
            numberOfLines={1}
          >
            {country?.name ||
              "Sélectionnez votre pays"}
          </Text>

          <Text
            style={
              styles.selectChevron
            }
          >
            ⌄
          </Text>
        </Pressable>

        <CountryDropdownModal
          visible={openDial}
          title="Indicatif"
          items={countries}
          onClose={() =>
            setOpenDial(false)
          }
          onSelect={(selected) => {
            setPhoneCountry(
              selected
            );

            setOpenDial(false);
          }}
        />

        <CountryDropdownModal
          visible={openCountry}
          title="Pays de résidence"
          items={countries}
          onClose={() =>
            setOpenCountry(false)
          }
          onSelect={(selected) => {
            setCountry(selected);
            setOpenCountry(false);
          }}
        />

        {/* Skin */}
        <SelectField
          label="Type de peau"
          value={skinType}
          onChange={setSkinType}
          options={SKIN_TYPES}
        />

        {/* Hair */}
        <SelectField
          label="Type de cheveux"
          value={hairType}
          onChange={setHairType}
          options={HAIR_TYPES}
        />

        {/* Email */}
        <Text style={styles.label}>
          Email
        </Text>

        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setFormError("");
          }}
          style={styles.input}
          placeholder="example@mail.com"
          placeholderTextColor="#A29C96"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        {/* Password */}
        <Text style={styles.label}>
          Mot de passe
        </Text>

        <TextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setFormError("");
          }}
          style={styles.input}
          placeholder="Minimum 6 caractères"
          placeholderTextColor="#A29C96"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
        />

        {/* Password confirmation */}
        <Text style={styles.label}>
          Confirmer le mot de passe
        </Text>

        <TextInput
          value={
            passwordConfirmation
          }
          onChangeText={(value) => {
            setPasswordConfirmation(
              value
            );
            setFormError("");
          }}
          style={styles.input}
          placeholder="Confirmez votre mot de passe"
          placeholderTextColor="#A29C96"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        {/* Visible error */}
        {formError ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {formError}
            </Text>
          </View>
        ) : null}

        {/* Registration button */}
        <Pressable
          onPress={submit}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.submit,

            isSubmitting &&
              styles.submitDisabled,

            pressed &&
              !isSubmitting &&
              styles.submitPressed,
          ]}
        >
          {isSubmitting ? (
            <View
              style={
                styles.submitLoading
              }
            >
              <ActivityIndicator
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.submitText
                }
              >
                Création...
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.submitText
              }
            >
              S’inscrire
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles =
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor:
        "#F7F1EA",
    },

    scroll: {
      flex: 1,
    },

    container: {
      paddingHorizontal: 18,
      paddingTop: 34,
      paddingBottom: 60,

      gap: 10,
    },

    title: {
      fontSize: 28,
      fontWeight: "900",

      color: "#3F3B37",

      marginBottom: 10,
    },

    label: {
      marginTop: 2,

      fontSize: 13,
      fontWeight: "800",

      color:
        "rgba(63,59,55,0.75)",
    },

    input: {
      height: 54,

      borderRadius: 14,

      paddingHorizontal: 14,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.12)",

      color: "#3F3B37",

      fontSize: 14,
      fontWeight: "600",
    },

    pickerBtn: {
      minHeight: 54,

      borderRadius: 14,

      paddingHorizontal: 14,

      justifyContent:
        "center",

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.12)",
    },

    pickerText: {
      fontSize: 14,
      fontWeight: "700",

      color: "#A29C96",
    },

    selectedPickerText: {
      color: "#3F3B37",
    },

    phoneRow: {
      height: 54,

      borderRadius: 14,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.12)",

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

    dialText: {
      fontSize: 14,
      fontWeight: "900",

      color: "#3F3B37",
    },

    chev: {
      fontSize: 14,

      color:
        "rgba(63,59,55,0.55)",
    },

    phoneInput: {
      flex: 1,
      height: "100%",

      color: "#3F3B37",

      fontSize: 14,
      fontWeight: "600",
    },

    selectRow: {
      height: 54,

      borderRadius: 14,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "rgba(63,59,55,0.12)",

      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 14,
    },

    selectText: {
      flex: 1,

      fontSize: 14,
      fontWeight: "700",

      color: "#3F3B37",
    },

    selectChevron: {
      fontSize: 16,

      color:
        "rgba(63,59,55,0.55)",
    },

    pressed: {
      opacity: 0.75,
    },

    errorBox: {
      marginTop: 6,

      paddingHorizontal: 14,
      paddingVertical: 12,

      borderRadius: 12,

      backgroundColor:
        "#FCECEA",
    },

    errorText: {
      color: "#B42318",

      fontSize: 13,
      fontWeight: "700",

      lineHeight: 19,
    },

    submit: {
      height: 56,

      borderRadius: 16,

      backgroundColor:
        "#3F3B37",

      alignItems: "center",
      justifyContent: "center",

      marginTop: 14,

      marginBottom: 10,
    },

    submitPressed: {
      opacity: 0.82,
    },

    submitDisabled: {
      opacity: 0.65,
    },

    submitText: {
      color: "#FFFFFF",

      fontSize: 16,
      fontWeight: "900",
    },

    submitLoading: {
      flexDirection: "row",
      alignItems: "center",

      gap: 10,
    },
  });