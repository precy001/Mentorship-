import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AppAlert } from "@/src/lib/alert";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button, BackLink, IconBadge } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import { apiAcceptCounsellorInvitation, apiMe } from "@/src/lib/api";
import { leaveScreen } from "@/src/lib/routes";

const POINTS: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }[] = [
  { icon: "log-in-outline", text: "Sign in (or create an account) before accepting. An emailed invitation must be accepted with the email address it was sent to." },
  { icon: "logo-whatsapp", text: "An invitation a counsellor shared on WhatsApp is reviewed by an administrator before you can take discussions." },
  { icon: "time-outline", text: "Invitations expire after seven days." },
];

export default function CounsellorInvite() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const app = useApp();
  const [working, setWorking] = useState(false);
  const [finished, setFinished] = useState(false);
  const accept = async () => {
    if (!token || typeof token !== "string") return AppAlert.alert("Invalid invitation", "The invitation link does not contain a valid token.");
    if (!app.user) return AppAlert.alert("Sign in required", "Sign in or create an account first, then open the invitation link again.");
    try {
      setWorking(true);
      const result = await apiAcceptCounsellorInvitation(token);
      setFinished(true);
      if (result.status === "PENDING_APPROVAL") {
        AppAlert.alert("Request sent", result.message || "An administrator will review your request. You'll be notified when it's approved.", [{ text: "OK", onPress: () => leaveScreen(app.user?.role) }]);
        return;
      }
      // Reload the account: the app switches to the counsellor workspace by itself (app/_layout.tsx).
      try {
        app.applyAccount(await apiMe());
        AppAlert.alert("Invitation accepted", "You are now a counsellor. Set yourself to Available when you're ready to receive discussions.", [{ text: "Open workspace", onPress: () => router.replace("/(counsellor)") }]);
      } catch {
        await app.logout();
        AppAlert.alert("Invitation accepted", `${result.email} is now a counsellor. Sign in again to open the counsellor workspace.`, [{ text: "Sign in", onPress: () => router.replace({ pathname: "/auth", params: { mode: "signin" } }) }]);
      }
    } catch (error) { AppAlert.alert("Invitation could not be accepted", error instanceof Error ? error.message : "Please contact the administrator who invited you."); }
    finally { setWorking(false); }
  };
  useEffect(() => { if (!token) setFinished(true); }, [token]);
  return <Screen>
    <BackLink onPress={() => leaveScreen(app.user?.role)} />
    <View style={{ gap: 16 }}>
      <IconBadge icon="people-outline" size={52} />
      <Heading title="Counsellor invitation" subtitle="Accept your invitation to join the Mentorship+ counselling team." />
      {!token ? (
        <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 10, backgroundColor: colors.warningBg, padding: 14, borderRadius: 16 }}>
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
          <Text style={{ color: colors.warning, flex: 1, lineHeight: 19, fontSize: 13, fontWeight: "600" }}>This invitation link is missing its token. Open the link from your invitation email again.</Text>
        </View>
      ) : null}
      <Card style={{ gap: 14 }}>
        {POINTS.map((point) => (
          <View key={point.text} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Ionicons name={point.icon} size={20} color={colors.primary} />
            <Text style={{ color: colors.ink, flex: 1, lineHeight: 20, fontSize: 14 }}>{point.text}</Text>
          </View>
        ))}
        {!app.user
          ? <Button title="Sign in to continue" onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} />
          : <Button title={working ? "Accepting…" : "Accept invitation"} loading={working} onPress={() => void accept()} disabled={finished || !token} />}
      </Card>
    </View>
  </Screen>;
}
