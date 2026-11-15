import React, { useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Button, Card, Field, BackLink, IconBadge } from "@/src/components/UI";
import { apiResendVerification, apiVerifyEmail } from "@/src/lib/api";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const [token, setToken] = useState(typeof params.token === "string" ? params.token : "");
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [busy, setBusy] = useState(false);
  const autoAttemptedToken = useRef<string | null>(null);

  useEffect(() => {
    const incomingToken = typeof params.token === "string" ? params.token.trim() : "";
    if (!incomingToken || autoAttemptedToken.current === incomingToken) return;

    autoAttemptedToken.current = incomingToken;
    setToken(incomingToken);
    setBusy(true);
    apiVerifyEmail(incomingToken)
      .then(result => {
        Alert.alert(
          "Email verified",
          result.message || "Your email is verified. You can now sign in.",
          [{ text: "Sign in", onPress: () => router.replace("/auth?mode=signin") }],
        );
      })
      .catch(error => {
        Alert.alert(
          "Couldn't verify email",
          error instanceof Error ? error.message : "The verification link could not be confirmed. Request a new link and try again.",
        );
      })
      .finally(() => setBusy(false));
  }, [params.token]);

  const verify = async () => {
    const normalizedToken = token.trim();
    if (normalizedToken.length < 32) {
      Alert.alert("Verification link needed", "Open the verification link from your email or paste its token here.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiVerifyEmail(normalizedToken);
      Alert.alert("Email verified", result.message || "Your email is verified. You can now sign in.", [
        { text: "Sign in", onPress: () => router.replace("/auth?mode=signin") },
      ]);
    } catch (error) {
      Alert.alert("Couldn't verify email", error instanceof Error ? error.message : "The verification link could not be confirmed. Request a new link and try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert("Check your email", "Enter the email address you registered with.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiResendVerification(normalizedEmail);
      Alert.alert("Check your inbox", result.message);
    } catch (error) {
      Alert.alert("Unable to resend link", error instanceof Error ? error.message : "Please try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackLink />
      <View style={{ gap: 16 }}>
        <IconBadge icon="mail-open-outline" size={52} />
        <Heading title="Verify your email" subtitle="Confirm your email address to activate your Mentorship+ account. Open the link we sent you, or paste its token below if the link doesn’t open the app." />
        <Card>
          <Field
            label="Verification token"
            icon="key-outline"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Paste verification token"
            multiline
            editable={!busy}
          />
          <Button title={busy ? "Please wait…" : "Verify email address"} loading={busy} onPress={() => void verify()} />
        </Card>
        <Card>
          <Heading title="Didn’t receive the email?" small subtitle="Check your spam folder, or request a new link." />
          <Field
            label="Registration email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            placeholder="name@example.com"
            returnKeyType="send"
            onSubmitEditing={() => void resend()}
            editable={!busy}
          />
          <Button title={busy ? "Please wait…" : "Resend verification link"} variant="secondary" disabled={busy} onPress={() => void resend()} />
        </Card>
      </View>
    </Screen>
  );
}
