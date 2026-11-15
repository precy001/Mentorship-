import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button, Field, BackLink, IconBadge } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { apiResetPassword } from "@/src/lib/api";

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token.trim() : "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!token) {
      Alert.alert("Invalid link", "Request a new password-reset email.");
      return;
    }
    const next = {
      password: password.length >= 8 ? null : "Use at least 8 characters.",
      confirm: password === confirm ? null : "Enter the same password in both fields.",
    };
    setErrors(next);
    if (next.password) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }
    if (next.confirm) {
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
      <BackLink label="Back to sign in" onPress={() => router.replace("/auth?mode=signin")} />
      <View style={{ gap: 16 }}>
        <IconBadge icon="lock-closed-outline" size={52} />
        <Heading title="Choose a new password" subtitle="Your reset link is validated securely by the server." />
        <Card>
          {!token ? (
            <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 10, backgroundColor: colors.warningBg, padding: 12, borderRadius: 14 }}>
              <Ionicons name="warning-outline" size={20} color={colors.warning} />
              <Text style={{ color: colors.warning, flex: 1, lineHeight: 19, fontSize: 13, fontWeight: "600" }}>This link is missing its token. Request a new password-reset email.</Text>
            </View>
          ) : null}
          <Field
            label="New password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: null })); }}
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            error={errors.password}
            editable={!busy}
          />
          <Field
            label="Confirm new password"
            icon="lock-closed-outline"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); if (errors.confirm) setErrors((e) => ({ ...e, confirm: null })); }}
            placeholder="Re-enter your password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            error={errors.confirm}
            editable={!busy}
          />
          <Button title={busy ? "Updating…" : "Update password"} loading={busy} onPress={() => void submit()} disabled={!token} />
        </Card>
      </View>
    </Screen>
  );
}
