import React, { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Button } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { apiRequestPasswordReset } from "@/src/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert("Check your email", "Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiRequestPasswordReset(normalizedEmail);
      Alert.alert("Check your inbox", result.message, [
        { text: "Back to sign in", onPress: () => router.replace("/auth?mode=signin") },
      ]);
    } catch (error) {
      Alert.alert("Unable to submit request", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text onPress={() => router.back()} style={{ color: colors.primary, fontWeight: "700", paddingVertical: 6 }}>‹  Back</Text>
      <View style={{ paddingTop: 18, gap: 14 }}>
        <Heading title="Reset your password" subtitle="Enter the email address associated with your Mentorship+ account." />
        <Card style={{ gap: 12 }}>
          <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor="#8993A1" autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={{ backgroundColor: "#F3F5F8", borderRadius: 15, paddingHorizontal: 16, paddingVertical: 15, color: colors.ink, fontSize: 14 }} />
          <Button title={busy ? "Submitting…" : "Send reset link"} onPress={submit} disabled={busy} />
        </Card>
      </View>
    </Screen>
  );
}
