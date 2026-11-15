import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button, BackLink, IconBadge } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import { apiAcceptCounsellorInvitation } from "@/src/lib/api";

const POINTS: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }[] = [
  { icon: "mail-outline", text: "The invitation is linked to the email address it was sent to." },
  { icon: "log-in-outline", text: "You must sign in with that account before accepting it." },
  { icon: "time-outline", text: "Invitations expire after seven days." },
];

export default function CounsellorInvite() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const app = useApp();
  const [working, setWorking] = useState(false);
  const [finished, setFinished] = useState(false);
  const accept = async () => {
    if (!token || typeof token !== "string") return Alert.alert("Invalid invitation", "The invitation link does not contain a valid token.");
    if (!app.user) return Alert.alert("Sign in required", "Sign in using the email address this invitation was sent to, then open the invitation link again.");
    try {
      setWorking(true);
      const result = await apiAcceptCounsellorInvitation(token);
      setFinished(true);
      await app.logout();
      Alert.alert("Invitation accepted", `${result.email} is now a counsellor. Sign in again to open the counsellor workspace.`, [{ text: "Sign in", onPress: () => router.replace({ pathname: "/auth", params: { mode: "signin" } }) }]);
    } catch (error) { Alert.alert("Invitation could not be accepted", error instanceof Error ? error.message : "Please contact the administrator who invited you."); }
    finally { setWorking(false); }
  };
  useEffect(() => { if (!token) setFinished(true); }, [token]);
  return <Screen>
    <BackLink />
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
