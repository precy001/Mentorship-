import React, { useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Button } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"signin" | "signup">(params.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const { login } = useApp();
  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert("Check your email", "Enter a valid email address to continue.");
    if (password.length < 6) return Alert.alert("Password too short", "Use at least 6 characters for this demo.");
    if (mode === "signup") { router.push({ pathname: "/register-lga", params: { email: email.trim() } }); return; }
    await login({ name: email.split("@")[0].replace(/[._-]/g, " "), role: "student" });
    router.replace("/(student)");
  };
  const inputStyle = { backgroundColor: "#F3F5F8", borderRadius: 17, paddingHorizontal: 18, paddingVertical: 17, fontSize: 15, color: colors.ink, borderWidth: 1, borderColor: "#EDF0F4" } as const;
  return <Screen style={{ flex: 1, paddingTop: 12, gap: 0 }}>
    <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}><Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>‹  Back</Text></Pressable>
    <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 30 }}>
      <Image source={require("../assets/guidance-logo.png")} style={{ width: 82, height: 82, borderRadius: 23, marginBottom: 23 }} resizeMode="cover" />
      <Text style={{ color: colors.ink, fontSize: 30, fontWeight: "600", letterSpacing: -0.9 }}>{mode === "signin" ? "Welcome back" : "Create your account"}</Text>
      <Text style={{ color: colors.muted, fontSize: 14, marginTop: 9, textAlign: "center" }}>{mode === "signin" ? "Sign in to continue to your account" : "Let’s get your Mentorship+ journey started"}</Text>
    </View>
    <View style={{ gap: 13 }}>
      <TextInput style={inputStyle} value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor="#8993A1" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextInput style={inputStyle} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#8993A1" secureTextEntry autoComplete={mode === "signin" ? "current-password" : "new-password"} />
      {mode === "signin" && <Text style={{ color: colors.primary, textAlign: "right", fontWeight: "700", fontSize: 12 }}>Demo account · any valid email</Text>}
      <Button title={mode === "signin" ? "Sign in" : "Continue"} onPress={submit} />
    </View>
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 30 }}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>{mode === "signin" ? "Don't have an account?" : "Already have an account?"}</Text>
      <Text onPress={() => setMode(mode === "signin" ? "signup" : "signin")} style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>{mode === "signin" ? "Create one" : "Sign in"}</Text>
    </View>
    <Text style={{ marginTop: "auto", paddingTop: 28, color: colors.mutedLight, fontSize: 11, lineHeight: 17, textAlign: "center" }}>Demo MVP only. Account details are stored locally on this device; no live authentication service is connected.</Text>
  </Screen>;
}
