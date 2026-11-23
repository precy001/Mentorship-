import React, { useState } from "react";
import { View } from "react-native";
import { AppAlert } from "@/src/lib/alert";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Field, BackLink, IconBadge } from "@/src/components/UI";
import { apiRequestPasswordReset } from "@/src/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await apiRequestPasswordReset(normalizedEmail);
      AppAlert.alert("Check your inbox", result.message, [
        { text: "Back to sign in", onPress: () => router.replace("/auth?mode=signin") },
      ]);
    } catch (caught) {
      AppAlert.alert("Unable to submit request", caught instanceof Error ? caught.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackLink />
      <View style={{ gap: 16 }}>
        <IconBadge icon="key-outline" size={52} />
        <Heading title="Reset your password" subtitle="Enter the email address linked to your Mentorship+ account and we’ll send you a reset link." />
        <Card>
          <Field
            label="Email address"
            icon="mail-outline"
            value={email}
            onChangeText={(v) => { setEmail(v); if (error) setError(null); }}
            placeholder="name@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => void submit()}
            error={error}
            editable={!busy}
          />
          <Button title={busy ? "Submitting…" : "Send reset link"} loading={busy} onPress={() => void submit()} />
        </Card>
      </View>
    </Screen>
  );
}
