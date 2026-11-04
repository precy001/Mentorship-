import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Button, Card } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { apiResendVerification, apiVerifyEmail } from "@/src/lib/api";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const [token, setToken] = useState(String(params.token || ""));
  const [email, setEmail] = useState(String(params.email || ""));
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (params.token) setToken(String(params.token)); }, [params.token]);

  const verify = async () => {
    if (token.trim().length < 32) return Alert.alert("Verification link needed", "Open the verification link from your email or paste its token here.");
    setBusy(true);
    try {
      const result = await apiVerifyEmail(token);
      Alert.alert("Email verified", result.message || "Your email is verified. You can now sign in.", [{ text: "Sign in", onPress: () => router.replace("/auth?mode=signin") }]);
    } catch (error) {
      Alert.alert("Couldn't verify email", error instanceof Error ? error.message : "The verification link could not be confirmed. Request a new link and try again.");
    } finally { setBusy(false); }
  };
  const resend = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return Alert.alert("Check your email", "Enter the email address you registered with.");
    setBusy(true);
    try { const result = await apiResendVerification(email); Alert.alert("Check your inbox", result.message); }
    catch (error) { Alert.alert("Unable to resend link", error instanceof Error ? error.message : "Please try again shortly."); }
    finally { setBusy(false); }
  };

  return <Screen style={{ justifyContent: "center", gap: 16 }}>
    <Text onPress={() => router.back()} style={{ color: colors.primary, fontWeight: "700" }}>‹  Back</Text>
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }}>ACCOUNT SECURITY</Text>
      <Text style={{ color: colors.ink, fontSize: 28, fontWeight: "800" }}>Verify your email</Text>
      <Text style={{ color: colors.muted, lineHeight: 22 }}>Confirm your email address to activate your Mentorship+ account. Open the link we sent you. If the link does not open the app, paste the token from the link below.</Text>
    </View>
    <Card style={{ gap: 12 }}>
      <Text style={{ color: colors.ink, fontWeight: "800" }}>Verification token</Text>
      <TextInput value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} placeholder="Paste verification token" placeholderTextColor="#8B95A3" multiline style={{ minHeight: 90, textAlignVertical: "top", backgroundColor: "#F3F5F8", borderRadius: 14, padding: 14, color: colors.ink }} />
      <Button title={busy ? "Please wait…" : "Verify email address"} onPress={verify} disabled={busy} />
    </Card>
    <Card style={{ gap: 10 }}>
      <Text style={{ color: colors.ink, fontWeight: "800" }}>Didn't receive the email?</Text>
      <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Your registration email" placeholderTextColor="#8B95A3" style={{ backgroundColor: "#F3F5F8", borderRadius: 14, padding: 15, color: colors.ink }} />
      <Button title="Resend verification link" variant="secondary" onPress={resend} disabled={busy} />
    </Card>
  </Screen>;
}
