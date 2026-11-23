import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Button, Card, Field, BackLink, StepProgress, OptionCard, Heading, ErrorState, LoadingBlock } from "@/src/components/UI";
import { DatePickerField } from "@/src/components/Forms";
import { colors } from "@/src/lib/theme";
import { parseDateString, toDateString } from "@/src/lib/validation";
import { apiGetMembershipCategories, apiRegister, type MembershipCategory } from "@/src/lib/api";

type Errors = Partial<Record<"name" | "email" | "whatsapp" | "dob" | "nin" | "category" | "subcategory" | "password" | "confirm", string>>;

export default function RegisterBiodata() {
  const p = useLocalSearchParams<{ state?: string; lga?: string; lcda?: string }>();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [whatsapp, setWhatsapp] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  // Stored as YYYY-MM-DD; the previous dd/mm/yyyy text was only ever converted to this before submission.
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState(""); const [busy, setBusy] = useState(false);
  const [nin, setNin] = useState("");
  const [categories, setCategories] = useState<MembershipCategory[]>([]);
  const [categoryId, setCategoryId] = useState(""); const [subcategoryId, setSubcategoryId] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const selectedCategory = categories.find(item => item.id === categoryId);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      setCategories(await apiGetMembershipCategories());
      setCategoriesError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please check your connection and try again.";
      setCategoriesError(message);
      Alert.alert("Unable to load account types", message);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);
  useEffect(() => { void loadCategories(); }, [loadCategories]);

  const today = toDateString(new Date());
  const now = new Date();
  const eighteenYearsAgo = toDateString(new Date(now.getFullYear() - 18, now.getMonth(), 1));
  const clearError = (key: keyof Errors) => setErrors(current => (current[key] ? { ...current, [key]: undefined } : current));

  const finish = async () => {
    // Same checks, same order and same alert wording as before; each failure is now also marked on its field.
    const next: Errors = {};
    let alertTitle = ""; let alertBody = "";
    const fail = (key: keyof Errors, title: string, body: string, inline: string) => { next[key] = inline; if (!alertTitle) { alertTitle = title; alertBody = body; } };
    if (name.trim().length < 2) fail("name", "Add your name", "Enter your full name to complete registration.", "Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) fail("email", "Check your email", "Enter a valid email address.", "Enter a valid email address.");
    if (whatsapp.replace(/\D/g, "").length < 10) fail("whatsapp", "Check your WhatsApp number", "Enter a valid phone number including your country code if needed.", "Enter a valid phone number, including your country code if needed.");
    const birthDate = dob ? parseDateString(dob) : null;
    if (!dob) fail("dob", "Select your date of birth", "Choose your date of birth from the calendar.", "Choose your date of birth.");
    else if (!birthDate || dob > today) fail("dob", "Check your date of birth", "Choose a valid date that is not in the future.", "Choose a valid date that is not in the future.");
    if (!/^\d{11}$/.test(nin)) fail("nin", "Check your NIN", "Enter your 11-digit National Identification Number (NIN).", "Enter your 11-digit NIN.");
    if (!categoryId) fail("category", "Choose your account type", "Select a category and the subcategory that best describes you.", "Select the category that best describes you.");
    else if (!subcategoryId) fail("subcategory", "Choose your account type", "Select a category and the subcategory that best describes you.", "Select a subcategory.");
    if (password.length < 8) fail("password", "Password too short", "Use at least 8 characters.", "Use at least 8 characters.");
    else if (password !== confirm) fail("confirm", "Passwords don't match", "Re-enter the same password in both fields.", "The passwords do not match.");
    setErrors(next);
    if (alertTitle) return Alert.alert(alertTitle, alertBody);

    setBusy(true);
    try {
      const result = await apiRegister({ email: email.trim(), password, displayName: name.trim(), phoneNumber: whatsapp.trim(), dateOfBirth: dob, stateOfResidence: String(p.state || ""), lga: String(p.lga || ""), lcda: String(p.lcda || ""), school: school.trim() || undefined, nin, categoryId, subcategoryId });
      Alert.alert("Registration submitted", result.message || "Your account has been created. Check your email to verify your address before signing in.", [{ text: "Continue to sign in", onPress: () => router.replace("/auth?mode=signin") }]);
    } catch (error) { Alert.alert("Registration failed", error instanceof Error ? error.message : "We could not create your account. Please try again."); }
    finally { setBusy(false); }
  };

  return <Screen>
    <BackLink />
    <StepProgress step={2} total={2} label="Your profile" />
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <Image source={require("../assets/guidance-logo.png")} style={{ width: 52, height: 52, borderRadius: 15 }} accessibilityElementsHidden importantForAccessibility="no" />
      <View style={{ flex: 1 }}><Heading title="Your profile" small subtitle="A few details to finish setting up your account." /></View>
    </View>

    <View accessible accessibilityLabel={`Location confirmed: ${p.lga}, ${p.lcda}, ${p.state} State`} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.successBg, borderRadius: 16, padding: 14 }}>
      <Ionicons name="location" size={20} color={colors.success} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.success, fontWeight: "800", fontSize: 13 }}>Location confirmed</Text>
        <Text style={{ color: colors.ink, fontSize: 13 }}>{p.lga} · {p.lcda}, {p.state} State</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Change location" hitSlop={10} onPress={() => router.back()} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }}>
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>Change</Text>
      </Pressable>
    </View>

    <Card>
      <Heading title="Your membership category" small subtitle="Choose the option that best describes you. Your dashboard and recommendations are tailored to this." />
      {categoriesLoading ? <LoadingBlock label="Loading categories…" /> : null}
      {!categoriesLoading && categoriesError ? <ErrorState title="Categories unavailable" message="Check your API connection and try again." onRetry={() => void loadCategories()} /> : null}
      {!categoriesLoading && !categoriesError && categories.length === 0 ? <Text style={{ color: colors.warning, fontWeight: "600" }}>No categories are available yet.</Text> : null}
      {categories.map(category => <OptionCard key={category.id} title={category.name} description={category.description} selected={categoryId === category.id} disabled={busy} onPress={() => { setCategoryId(category.id); setSubcategoryId(""); clearError("category"); clearError("subcategory"); }} />)}
      {errors.category ? <Text accessibilityLiveRegion="polite" style={{ color: colors.error, fontSize: 12, fontWeight: "600" }}>{errors.category}</Text> : null}
      {selectedCategory ? <View style={{ gap: 8, paddingTop: 6 }}>
        <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 14 }}>Select your subcategory</Text>
        {selectedCategory.subcategories.map(sub => <OptionCard key={sub.id} title={sub.name} selected={subcategoryId === sub.id} disabled={busy} onPress={() => { setSubcategoryId(sub.id); clearError("subcategory"); }} />)}
        {errors.subcategory ? <Text accessibilityLiveRegion="polite" style={{ color: colors.error, fontSize: 12, fontWeight: "600" }}>{errors.subcategory}</Text> : null}
      </View> : null}
    </Card>

    <Card>
      <Heading title="Personal details" small />
      <Field label="Full name" icon="person-outline" value={name} onChangeText={v => { setName(v); clearError("name"); }} placeholder="e.g. Ada Okafor" autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" required error={errors.name} editable={!busy} />
      <Field label="Email address" icon="mail-outline" value={email} onChangeText={v => { setEmail(v); clearError("email"); }} placeholder="name@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="next" required error={errors.email} editable={!busy} />
      <Field label="WhatsApp number" icon="logo-whatsapp" value={whatsapp} onChangeText={v => { setWhatsapp(v); clearError("whatsapp"); }} placeholder="+234 801 234 5678" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" required error={errors.whatsapp} editable={!busy} />
      <DatePickerField label="Date of birth" value={dob} onChange={v => { setDob(v); clearError("dob"); }} minDate={`${now.getFullYear() - 100}-01-01`} maxDate={today} defaultView={eighteenYearsAgo} descendingYears placeholder="Select date of birth" required error={errors.dob} disabled={busy} />
      <Field label="National Identification Number (NIN)" icon="card-outline" value={nin} onChangeText={v => { setNin(v.replace(/\D/g, "").slice(0, 11)); clearError("nin"); }} placeholder="11-digit NIN" keyboardType="number-pad" maxLength={11} required helper="Your 11-digit NIN. It stays private to your account." error={errors.nin} editable={!busy} />
      <Field label="School / institution" icon="school-outline" value={school} onChangeText={setSchool} placeholder="Where you study or studied" autoCapitalize="words" optional editable={!busy} />
    </Card>

    <Card>
      <Heading title="Secure your account" small />
      <Field label="Create password" icon="lock-closed-outline" value={password} onChangeText={v => { setPassword(v); clearError("password"); }} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password" textContentType="newPassword" returnKeyType="next" required error={errors.password} editable={!busy} />
      <Field label="Confirm password" icon="lock-closed-outline" value={confirm} onChangeText={v => { setConfirm(v); clearError("confirm"); }} placeholder="Re-enter your password" secureTextEntry autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => void finish()} required error={errors.confirm} editable={!busy} />
    </Card>

    <Button title={busy ? "Creating account…" : "Complete registration"} loading={busy} disabled={categoriesLoading} onPress={() => void finish()} />
    <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: "center" }}>Your details will be securely submitted to Mentorship+ for account creation.</Text>
  </Screen>;
}
