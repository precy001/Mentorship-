import React, { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { apiResetPassword } from "@/src/lib/api";

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token.trim() : "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!token) {
      Alert.alert("Invalid link", "Request a new password-reset email.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", "Enter the same password in both fields.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiResetPassword(token, password);
      Alert.alert("Password updated", result.message, [
        { text: "Continue", onPress: () => router.replace("/auth?mode=signin") },
      ]);
    } catch (error) {
      Alert.alert("Unable to reset password", error instanceof Error ? error.message : "Request a new reset link and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text onPress={() => router.replace("/auth?mode=signin")} style={{ color: colors.primary, fontWeight: "700", paddingVertical: 6 }}>‹  Back to sign in</Text>
      <View style={{ paddingTop: 18, gap: 14 }}>
        <Heading title="Choose a new password" subtitle="Your reset link is validated securely by the server." />
        <Card style={{ gap: 12 }}>
          {!token ? <Text style={{ color: "#B45309" }}>This link is missing its token. Request a new password-reset email.</Text> : null}
          <TextInput value={password} onChangeText={setPassword} placeholder="New password (at least 8 characters)" placeholderTextColor="#8993A1" secureTextEntry autoComplete="new-password" style={{ backgroundColor: "#F3F5F8", borderRadius: 15, paddingHorizontal: 16, paddingVertical: 15, color: colors.ink, fontSize: 14 }} />
          <TextInput value={confirm} onChangeText={setConfirm} placeholder="Confirm new password" placeholderTextColor="#8993A1" secureTextEntry autoComplete="new-password" style={{ backgroundColor: "#F3F5F8", borderRadius: 15, paddingHorizontal: 16, paddingVertical: 15, color: colors.ink, fontSize: 14 }} />
          <Button title={busy ? "Updating…" : "Update password"} onPress={submit} disabled={busy || !token} />
        </Card>
      </View>
    </Screen>
  );
}
