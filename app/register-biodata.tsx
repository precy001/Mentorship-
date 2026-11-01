import React, { useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Button } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";

export default function RegisterBiodata() {
  const p = useLocalSearchParams<{ email?: string; password?: string; state?: string; lga?: string; lcda?: string }>();
  const [name, setName] = useState(""); const [email, setEmail] = useState(String(p.email || "")); const [whatsapp, setWhatsapp] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [dob, setDob] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear() - 18, new Date().getMonth(), 1));
  const [school, setSchool] = useState(""); const { login } = useApp();
  const monthLabel = visibleMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const calendarDays = useMemo(() => {
    const firstWeekday = (new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay() + 6) % 7;
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  }, [visibleMonth]);
  const selectDate = (day: number) => {
    const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    const today = new Date();
    if (date > today) return;
    setDob(`${String(day).padStart(2, "0")}/${String(visibleMonth.getMonth() + 1).padStart(2, "0")}/${visibleMonth.getFullYear()}`);
    setCalendarOpen(false);
  };
  const input = (placeholder: string, value: string, change: (s: string) => void, extra: object = {}) => <TextInput placeholder={placeholder} placeholderTextColor="#8B95A3" value={value} onChangeText={change} style={{ backgroundColor: "#F3F5F8", borderRadius: 15, paddingHorizontal: 16, paddingVertical: 15, color: colors.ink, fontSize: 14, borderWidth: 1, borderColor: "#EDF0F4" }} {...extra} />;
  const finish = async () => {
    if (name.trim().length < 2) return Alert.alert("Add your name", "Enter your full name to complete registration.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert("Check your email", "Enter a valid email address.");
    if (whatsapp.replace(/\D/g, "").length < 10) return Alert.alert("Check your WhatsApp number", "Enter a valid phone number including your country code if needed.");
    if (!dob) return Alert.alert("Select your date of birth", "Choose your date of birth from the calendar.");
    const [dayPart, monthPart, yearPart] = dob.split("/").map(Number);
    const birthDate = new Date(yearPart, monthPart - 1, dayPart);
    if (!dayPart || !monthPart || !yearPart || birthDate.getDate() !== dayPart || birthDate.getMonth() !== monthPart - 1 || birthDate.getFullYear() !== yearPart || birthDate > new Date()) return Alert.alert("Check your date of birth", "Choose a valid date that is not in the future.");
    if (password.length < 6) return Alert.alert("Password too short", "Use at least 6 characters.");
    if (password !== confirm) return Alert.alert("Passwords don't match", "Re-enter the same password in both fields.");
    await login({ name: name.trim(), role: "student", state: String(p.state || "Lagos"), lga: `${p.lga || ""} · ${p.lcda || ""}` });
    Alert.alert("Registration successful", "Your demo profile has been created on this device.", [{ text: "Continue", onPress: () => router.replace("/(student)") }]);
  };
  return <Screen style={{ paddingHorizontal: 20 }}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 26 }}>
      <Text onPress={() => router.back()} style={{ color: colors.primary, fontWeight: "700", paddingVertical: 6 }}>‹  Back</Text>
      <View style={{ alignItems: "center", paddingTop: 4, paddingBottom: 7 }}><Image source={require("../assets/guidance-logo.png")} style={{ width: 58, height: 58, borderRadius: 16, marginBottom: 12 }} /><Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }}>STEP 2 OF 2</Text><Text style={{ color: colors.ink, fontSize: 27, fontWeight: "700", letterSpacing: -0.7, marginTop: 6 }}>Your profile</Text><Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 6 }}>A few details to finish setting up your account.</Text></View>
      <View style={{ backgroundColor: "#EDF9F6", borderRadius: 14, padding: 13, gap: 4 }}><Text style={{ color: colors.primaryDark, fontWeight: "800", fontSize: 13 }}>✓  Location confirmed</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{p.lga} · {p.lcda}, {p.state} State</Text></View>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "800" }}>Personal details</Text>
      {input("Full name", name, setName, { autoCapitalize: "words", autoComplete: "name" })}
      {input("Email address", email, setEmail, { autoCapitalize: "none", keyboardType: "email-address", autoComplete: "email" })}
      {input("WhatsApp number (e.g. +234...) ", whatsapp, setWhatsapp, { keyboardType: "phone-pad" })}
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "700" }}>Date of birth</Text>
      <Pressable onPress={() => setCalendarOpen(true)} accessibilityRole="button" style={{ backgroundColor: "#F3F5F8", borderRadius: 15, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: "#DDE3FF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: dob ? colors.ink : "#8B95A3", fontSize: 14 }}>{dob || "Select date of birth"}</Text>
        <Text style={{ color: colors.primary, fontSize: 18 }}>▦</Text>
      </Pressable>
      {input("School / institution (optional)", school, setSchool, { autoCapitalize: "words" })}
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "800", marginTop: 2 }}>Secure your account</Text>
      {input("Create password (at least 6 characters)", password, setPassword, { secureTextEntry: true, autoComplete: "new-password" })}
      {input("Confirm password", confirm, setConfirm, { secureTextEntry: true, autoComplete: "new-password" })}
      <Button title="Complete registration" onPress={finish} />
      <Text style={{ color: colors.mutedLight, fontSize: 11, lineHeight: 16, textAlign: "center" }}>This is a local MVP demo. Passwords are not sent to a server and production authentication is not connected.</Text>
      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.42)", justifyContent: "center", padding: 22 }}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ color: colors.ink, fontSize: 19, fontWeight: "800", marginBottom: 4 }}>Date of birth</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 16 }}>Select your day, month, and year.</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Pressable accessibilityLabel="Previous month" onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} style={{ padding: 10 }}><Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700" }}>‹</Text></Pressable>
              <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "800" }}>{monthLabel}</Text>
              <Pressable accessibilityLabel="Next month" onPress={() => { const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1); const now = new Date(); if (next <= new Date(now.getFullYear(), now.getMonth(), 1)) setVisibleMonth(next); }} style={{ padding: 10 }}><Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700" }}>›</Text></Pressable>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 8 }}>{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <Text key={`${d}${i}`} style={{ width: "13%", textAlign: "center", color: colors.muted, fontSize: 12, fontWeight: "700" }}>{d}</Text>)}</View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{calendarDays.map((day, i) => {
              if (day === null) return <View key={`blank-${i}`} style={{ width: "14.28%", height: 42 }} />;
              const selected = dob === `${String(day).padStart(2, "0")}/${String(visibleMonth.getMonth() + 1).padStart(2, "0")}/${visibleMonth.getFullYear()}`;
              const future = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day) > new Date();
              return <Pressable key={day} disabled={future} onPress={() => selectDate(day)} style={{ width: "14.28%", height: 42, alignItems: "center", justifyContent: "center" }}><View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.primary : "transparent" }}><Text style={{ color: selected ? "#FFFFFF" : future ? "#CBD5E1" : colors.ink, fontWeight: selected ? "800" : "500" }}>{day}</Text></View></Pressable>;
            })}</View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable onPress={() => setCalendarOpen(false)} style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#F1F5F9" }}><Text style={{ color: colors.ink, fontWeight: "700" }}>Cancel</Text></Pressable>
              <Pressable onPress={() => { setDob(""); setCalendarOpen(false); }} style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.accentTint }}><Text style={{ color: colors.primaryDark, fontWeight: "700" }}>Clear date</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  </Screen>;
}
