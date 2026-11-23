import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Button, Card, Field, BackLink, IconBadge } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import { apiResendVerification, apiVerifyEmail } from "@/src/lib/api";
import { homeHrefFor, leaveScreen } from "@/src/lib/routes";

type Status =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "verified"; message: string }
  | { kind: "failed"; message: string };

const MIN_TOKEN_LENGTH = 32;

/**
 * Email verification. Opening the link from the email lands here with the token and confirms it straight away.
 * The progress and the result are shown on this screen rather than in pop-ups, so the screen always has
 * content even when the app was launched (or brought back) by the link and is still settling.
 */
export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const app = useApp();
  const [token, setToken] = useState(typeof params.token === "string" ? params.token : "");
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [resending, setResending] = useState(false);
  const attemptedToken = useRef<string | null>(null);

  const verifying = status.kind === "verifying";
  const verified = status.kind === "verified";

  const runVerification = async (value: string) => {
    attemptedToken.current = value;
    setStatus({ kind: "verifying" });
    try {
      const result = await apiVerifyEmail(value);
      setStatus({ kind: "verified", message: result.message || "Your email is verified. You can now sign in." });
    } catch (error) {
      setStatus({
        kind: "failed",
        message: error instanceof Error ? error.message : "The verification link could not be confirmed. Request a new link and try again.",
      });
    }
  };

  // Opened from the email link (cold start or while the app was already open): confirm it once.
  useEffect(() => {
    const incoming = typeof params.token === "string" ? params.token.trim() : "";
    if (!incoming || attemptedToken.current === incoming) return;
    setToken(incoming);
    void runVerification(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  const verifyPasted = () => {
    const value = token.trim();
    if (value.length < MIN_TOKEN_LENGTH) {
      Alert.alert("Verification link needed", "Open the verification link from your email or paste its token here.");
      return;
    }
    void runVerification(value);
  };

  const resend = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert("Check your email", "Enter the email address you registered with.");
      return;
    }
    setResending(true);
    try {
      const result = await apiResendVerification(normalizedEmail);
      Alert.alert("Check your inbox", result.message);
    } catch (error) {
      Alert.alert("Unable to resend link", error instanceof Error ? error.message : "Please try again shortly.");
    } finally {
      setResending(false);
    }
  };

  const continueAfterVerify = () => {
    if (app.user) router.replace(homeHrefFor(app.user.role));
    else router.replace("/auth?mode=signin");
  };

  return (
    <Screen>
      <BackLink onPress={() => leaveScreen(app.user?.role)} />
      <View style={{ gap: 16 }}>
        <IconBadge icon={verified ? "checkmark-circle-outline" : "mail-open-outline"} tone={verified ? "green" : "brand"} size={52} />
        <Heading
          title={verified ? "Email verified" : "Verify your email"}
          subtitle={
            verified
              ? "Your Mentorship+ account is active."
              : "Confirm your email address to activate your Mentorship+ account. Open the link we sent you, or paste its token below if the link doesn’t open the app."
          }
        />

        {verifying ? (
          <Card style={{ alignItems: "center", gap: 12, paddingVertical: 28 }}>
            <ActivityIndicator color={colors.primary} />
            <Text accessibilityRole="progressbar" style={{ color: colors.ink, fontSize: 15, fontWeight: "700" }}>Confirming your email…</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center" }}>This can take up to a minute if the server is waking up.</Text>
          </Card>
        ) : null}

        {status.kind === "verified" ? (
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={{ color: colors.ink, flex: 1, fontSize: 15, lineHeight: 22 }}>{status.message}</Text>
            </View>
            <Button title={app.user ? "Continue" : "Continue to sign in"} icon="arrow-forward" onPress={continueAfterVerify} />
          </Card>
        ) : null}

        {status.kind === "failed" ? (
          <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 10, backgroundColor: colors.errorBg, padding: 14, borderRadius: 16 }}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={{ color: colors.error, flex: 1, lineHeight: 19, fontSize: 13, fontWeight: "600" }}>{status.message}</Text>
          </View>
        ) : null}

        {!verified ? (
          <>
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
                editable={!verifying}
              />
              <Button title={verifying ? "Please wait…" : "Verify email address"} loading={verifying} disabled={verifying} onPress={verifyPasted} />
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
                editable={!resending}
              />
              <Button title={resending ? "Sending link…" : "Resend verification link"} variant="secondary" loading={resending} disabled={resending || verifying} onPress={() => void resend()} />
            </Card>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
