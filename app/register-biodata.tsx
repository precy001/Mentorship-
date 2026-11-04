import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Button } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { apiGetMembershipCategories, apiRegister, type MembershipCategory } from "@/src/lib/api";

export default function RegisterBiodata() {
  const p = useLocalSearchParams<{ state?: string; lga?: string; lcda?: string }>();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [whatsapp, setWhatsapp] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [dob, setDob] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear() - 18, new Date().getMonth(), 1));
  const [school, setSchool] = useState(""); const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<MembershipCategory[]>([]);
  const [categoryId, setCategoryId] = useState(""); const [subcategoryId, setSubcategoryId] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const selectedCategory = categories.find(item => item.id === categoryId);
  useEffect(() => { let active = true; apiGetMembershipCategories().then(items => { if (active) setCategories(items); }).catch(error => Alert.alert("Unable to load account types", error instanceof Error ? error.message : "Please check your connection and try again.")).finally(() => { if (active) setCategoriesLoading(false); }); return () => { active = false; }; }, []);
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
    if (!categoryId || !subcategoryId) return Alert.alert("Choose your account type", "Select a category and the subcategory that best describes you.");
    if (password.length < 8) return Alert.alert("Password too short", "Use at least 8 characters.");
    if (password !== confirm) return Alert.alert("Passwords don't match", "Re-enter the same password in both fields.");
    setBusy(true);
    try {
      const result = await apiRegister({ email: email.trim(), password, displayName: name.trim(), phoneNumber: whatsapp.trim(), dateOfBirth: `${yearPart}-${String(monthPart).padStart(2,"0")}-${String(dayPart).padStart(2,"0")}`, stateOfResidence: String(p.state || ""), lga: String(p.lga || ""), lcda: String(p.lcda || ""), school: school.trim() || undefined, categoryId, subcategoryId });
      Alert.alert("Registration submitted", result.message || "Your account has been created. Check your email to verify your address before signing in.", [{ text: "Continue to sign in", onPress: () => router.replace("/auth?mode=signin") }]);
    } catch (error) { Alert.alert("Registration failed", error instanceof Error ? error.message : "We could not create your account. Please try again."); }
    finally { setBusy(false); }
  };
  return <Screen style={{ paddingHorizontal: 20 }}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 26 }}>
      <Text onPress={() => router.back()} style={{ color: colors.primary, fontWeight: "700", paddingVertical: 6 }}>‹  Back</Text>
      <View style={{ alignItems: "center", paddingTop: 4, paddingBottom: 7 }}><Image source={require("../assets/guidance-logo.png")} style={{ width: 58, height: 58, borderRadius: 16, marginBottom: 12 }} /><Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }}>STEP 2 OF 2</Text><Text style={{ color: colors.ink, fontSize: 27, fontWeight: "700", letterSpacing: -0.7, marginTop: 6 }}>Your profile</Text><Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 6 }}>A few details to finish setting up your account.</Text></View>
      <View style={{ backgroundColor: "#EDF9F6", borderRadius: 14, padding: 13, gap: 4 }}><Text style={{ color: colors.primaryDark, fontWeight: "800", fontSize: 13 }}>✓  Location confirmed</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{p.lga} · {p.lcda}, {p.state} State</Text></View>
      <View style={{ gap: 10, padding: 15, backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: colors.line }}>
        <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>Your membership category</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Choose the option that best describes you. Your dashboard and recommendations will be tailored to this selection.</Text>
        {categoriesLoading ? <Text style={{ color: colors.muted, paddingVertical: 10 }}>Loading categories…</Text> : categories.length === 0 ? <Text style={{ color: "#B45309", paddingVertical: 8 }}>Categories are unavailable. Check your API connection and try again.</Text> : categories.map(category => <Pressable key={category.id} onPress={() => { setCategoryId(category.id); setSubcategoryId(""); }} style={{ padding: 13, borderRadius: 12, borderWidth: 1, borderColor: categoryId === category.id ? colors.primary : colors.line, backgroundColor: categoryId === category.id ? colors.accentTint : "#FFFFFF", gap: 3 }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{category.name}</Text>{!!category.description && <Text style={{ color: colors.muted, fontSize: 12 }}>{category.description}</Text>}</Pressable>)}
        {!!selectedCategory && <View style={{ gap: 8, paddingTop: 5 }}><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 13 }}>Select your subcategory</Text>{selectedCategory.subcategories.map(sub => <Pressable key={sub.id} onPress={() => setSubcategoryId(sub.id)} style={{ padding: 12, borderRadius: 11, borderWidth: 1, borderColor: subcategoryId === sub.id ? colors.primary : colors.line, backgroundColor: subcategoryId === sub.id ? colors.accentTint : "#FFFFFF" }}><Text style={{ color: colors.ink, fontWeight: subcategoryId === sub.id ? "800" : "500" }}>{subcategoryId === sub.id ? "✓  " : ""}{sub.name}</Text></Pressable>)}</View>}
      </View>
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
      {input("Create password (at least 8 characters)", password, setPassword, { secureTextEntry: true, autoComplete: "new-password" })}
      {input("Confirm password", confirm, setConfirm, { secureTextEntry: true, autoComplete: "new-password" })}
      <Button title={busy ? "Creating account…" : "Complete registration"} onPress={finish} disabled={busy || categoriesLoading || !categoryId || !subcategoryId} />
      <Text style={{ color: colors.mutedLight, fontSize: 11, lineHeight: 16, textAlign: "center" }}>Your details will be securely submitted to Mentorship+ for account creation.</Text>
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
