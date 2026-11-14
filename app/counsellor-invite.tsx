import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import { apiAcceptCounsellorInvitation } from "@/src/lib/api";
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
    <Heading title="Counsellor invitation" subtitle="Accept your invitation to join the Mentorship+ counselling team." />
    <Card><Text style={{ color: colors.muted, lineHeight: 21 }}>The invitation is linked to the email address it was sent to. You must sign in with that account before accepting it. Invitations expire after seven days.</Text>
      {!app.user ? <Button title="Sign in to continue" onPress={() => router.push({ pathname: "/auth", params: { mode: "signin" } })} /> : <Button title={working ? "Accepting…" : "Accept invitation"} onPress={() => void accept()} disabled={working || finished || !token} />}
      {working ? <ActivityIndicator color={colors.primary} /> : null}
    </Card>
  </Screen>;
}
