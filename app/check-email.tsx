import React, { useEffect, useState } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button, BackLink, IconBadge } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { AppAlert } from "@/src/lib/alert";
import { apiResendVerification } from "@/src/lib/api";

const RESEND_WAIT_SECONDS = 60;

/**
 * Shown straight after registering: the account only works once the email address is verified, and the
 * verification email often lands in Spam or Junk, so this says so clearly and offers a resend.
 */
export default function CheckEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  const [sending, setSending] = useState(false);
  const [wait, setWait] = useState(RESEND_WAIT_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const resend = async () => {
    if (!email) return router.replace("/verify");
    setSending(true);
    try {
      await apiResendVerification(email);
      setWait(RESEND_WAIT_SECONDS);
      AppAlert.alert("Email sent again", `We sent a new verification link to ${email}. Check your Inbox and your Spam or Junk folder.`);
    } catch (error) {
      AppAlert.alert("Unable to resend link", error instanceof Error ? error.message : "Please try again shortly.");
    } finally {
      setSending(false);
    }
  };

  // iPhone can open the Mail app directly. Android has no single "open my inbox" link, so people switch apps.
  const openMail = async () => {
    try { await Linking.openURL("message://"); } catch { AppAlert.alert("Open your email app", "Switch to your email app to find the verification email."); }
  };

  return (
    <Screen>
      <BackLink label="Sign in" onPress={() => router.replace("/auth?mode=signin")} />
      <View style={{ gap: 16 }}>
        <IconBadge icon="mail-unread-outline" size={56} />
        <Heading title="Check your inbox" subtitle="One last step: verify your email address to activate your account." />

        <Card style={{ gap: 10 }}>
          <Text style={{ color: colors.ink, fontSize: 15, lineHeight: 22 }}>
            We sent a verification link to{email ? <Text style={{ fontWeight: "800" }}>{` ${email}`}</Text> : " your email address"}. Open it on this phone to finish.
          </Text>
        </Card>

        <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 12, backgroundColor: colors.warningBg, borderRadius: 18, padding: 16 }}>
          <Ionicons name="alert-circle" size={22} color={colors.warning} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 15 }}>Can’t see it? Check your Spam or Junk folder.</Text>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>In Gmail, also check the Promotions and Updates tabs. If it’s in Spam, mark it as “Not spam” so our emails reach your inbox next time. It can take a few minutes to arrive.</Text>
          </View>
        </View>

        {Platform.OS === "ios" ? <Button title="Open Mail" icon="mail-open-outline" variant="secondary" onPress={() => void openMail()} /> : null}
        <Button
          title={sending ? "Sending…" : wait > 0 ? `Resend email in ${wait}s` : "Resend verification email"}
          icon="refresh"
          variant="secondary"
          loading={sending}
          disabled={sending || wait > 0}
          onPress={() => void resend()}
        />
        <Button title="I’ve verified — sign in" icon="log-in-outline" onPress={() => router.replace("/auth?mode=signin")} />
        <Button title="Used the wrong email? Register again" variant="ghost" size="sm" onPress={() => router.replace({ pathname: "/auth", params: { mode: "signup" } })} />
      </View>
    </Screen>
  );
}
