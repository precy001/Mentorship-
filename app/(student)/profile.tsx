import React from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Row, Pill } from "@/src/components/UI";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
export default function Profile() {
  const app = useApp(); const masked = app.user?.nin ? `•••••••${app.user.nin.slice(-4)}` : "Not linked";
  return <Screen><Heading title="Your profile" subtitle="Manage your demo profile and personal settings." />
    <Card><Row><View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: colors.softBlue, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 24 }}>☺</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.ink, fontWeight: "900", fontSize: 18 }}>{app.user?.name || "Demo Student"}</Text><Text style={{ color: colors.muted }}>{app.user?.role || "student"} account</Text></View><Pill label="Demo" /></Row>
      <View style={{ height: 1, backgroundColor: colors.line }} /><Text style={{ color: colors.muted, fontSize: 12 }}>IDENTITY INFORMATION</Text><Text style={{ color: colors.ink, fontWeight: "700" }}>NIN · {masked}</Text><Text style={{ color: colors.ink }}>LGA · {app.user?.lga || "Not verified"}</Text><Text style={{ color: colors.ink }}>State · {app.user?.state || "—"}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Identity values are mock data and should not be used for real verification.</Text></Card>
    <Card><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16 }}>Your activity</Text><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted }}>Saved resources</Text><Text style={{ color: colors.ink, fontWeight: "800" }}>{app.savedResources.length}</Text></Row><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted }}>Saved scholarships</Text><Text style={{ color: colors.ink, fontWeight: "800" }}>{app.savedScholarships.length}</Text></Row><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted }}>Appointments</Text><Text style={{ color: colors.ink, fontWeight: "800" }}>{app.bookings.filter(b => b.status !== "cancelled").length}</Text></Row><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted }}>Mood check-ins</Text><Text style={{ color: colors.ink, fontWeight: "800" }}>{app.moods.length}</Text></Row></Card>
    <Button title="Saved items" onPress={() => router.push({ pathname: "/feature/[slug]", params: { slug: "saved" } })} variant="secondary" />
    <Button title="Help & frequently asked questions" onPress={() => router.push({ pathname: "/feature/[slug]", params: { slug: "help" } })} variant="ghost" />
    <Button title="Log out" onPress={() => Alert.alert("Log out?", "Return to the demo welcome screen?", [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: async () => { await app.logout(); router.replace("/"); } }])} variant="danger" />
    <Button title="Reset demo data" onPress={() => Alert.alert("Reset demo data?", "This clears local demo changes from this device.", [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: async () => { await app.resetDemo(); router.replace("/"); } }])} variant="ghost" />
  </Screen>;
}
