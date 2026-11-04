import React, { useRef, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Button } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import { apiLogin } from "@/src/lib/api";

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"signin" | "signup">(
    params.mode === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const { login } = useApp();

  const submit = async () => {
    if (mode === "signup") {
      router.push("/register-lga");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert("Check your email", "Enter a valid email address.");
      return;
    }
    if (!password) {
      Alert.alert("Enter your password", "Your password is required to sign in.");
      return;
    }
    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    try {
      const user = await apiLogin(normalizedEmail, password);
      const appRole =
        user.role === "COUNSELLOR"
          ? "counsellor"
          : user.role === "ADMIN"
            ? "admin"
            : user.role === "SUPER_ADMIN"
              ? "super_admin"
              : "member";

      // The assertion keeps this screen compatible with AppContext versions
      // whose local role union has not yet been expanded to all server roles.
      await login({
        id: user.id,
        email: user.email,
        name: user.displayName || normalizedEmail.split("@")[0],
        role: appRole,
        categoryId: user.profile?.category?.id,
        categoryName: user.profile?.category?.name,
        categorySlug: user.profile?.category?.slug,
        subcategoryId: user.profile?.subcategory?.id,
        subcategoryName: user.profile?.subcategory?.name,
        subcategorySlug: user.profile?.subcategory?.slug,
      } as Parameters<typeof login>[0]);

      if (user.role === "COUNSELLOR") {
        router.replace("/(counsellor)");
      } else if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
        router.replace("/(admin)");
      } else {
        router.replace("/(student)");
      }
    } catch (error) {
      Alert.alert(
        "Unable to sign in",
        error instanceof Error ? error.message : "We could not sign you in. Check your details and try again.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const inputStyle = {
    backgroundColor: "#F3F5F8",
    borderRadius: 17,
    paddingHorizontal: 18,
    paddingVertical: 17,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: "#EDF0F4",
  } as const;

  return (
    <Screen style={{ flex: 1, paddingTop: 12, gap: 0 }}>
      <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}>
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>
          ‹  Back
        </Text>
      </Pressable>

      <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 30 }}>
        <Image
          source={require("../assets/guidance-logo.png")}
          style={{ width: 82, height: 82, borderRadius: 23, marginBottom: 23 }}
          resizeMode="cover"
        />
        <Text style={{ color: colors.ink, fontSize: 30, fontWeight: "600", letterSpacing: -0.9 }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, marginTop: 9, textAlign: "center" }}>
          {mode === "signin"
            ? "Sign in to continue to your account"
            : "Let’s get your Mentorship+ journey started"}
        </Text>
      </View>

      <View style={{ gap: 13 }}>
        {mode === "signin" && (
          <>
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#8993A1"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextInput
              style={inputStyle}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#8993A1"
              secureTextEntry
              autoComplete="current-password"
            />
          </>
        )}
        <Button
          title={busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Continue to registration"}
          onPress={submit}
          disabled={busy}
        />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 30 }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
        </Text>
        <Text
          onPress={() => {
            if (!busy) setMode(mode === "signin" ? "signup" : "signin");
          }}
          style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}
        >
          {mode === "signin" ? "Create one" : "Sign in"}
        </Text>
      </View>

      <Text style={{ marginTop: "auto", paddingTop: 28, color: colors.mutedLight, fontSize: 11, lineHeight: 17, textAlign: "center" }}>
        Your account is protected by secure server-side authentication.
      </Text>
    </Screen>
  );
}
