import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Pill, Field } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
export default function CounsellorWorkspace() {
  const app = useApp(); const [message, setMessage] = useState(""); const [active, setActive] = useState("Academics");
  return <Screen>
    <Text onPress={() => Alert.alert("Sign out?", "Return to role selection?", [{ text: "Stay", style: "cancel" }, { text: "Sign out", onPress: async () => { await app.logout(); router.replace("/"); } }])} style={{ color: colors.primary, fontWeight: "800" }}>← Sign out</Text>
    <Heading title="Counsellor workspace" subtitle={`Welcome, ${app.user?.name || "Counsellor"}. This is a seeded demo account.`} />
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}><Text style={{ color: "#B8F2E8", fontWeight: "800" }}>YOUR OVERVIEW</Text><Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>Make space for every student.</Text><Text style={{ color: "#E1EDF5" }}>Review mock discussions and appointments within your assigned topics.</Text></Card>
    <View style={{ flexDirection: "row", gap: 8 }}><Card style={{ flex: 1 }}><Text style={{ color: colors.muted, fontSize: 12 }}>Assigned topics</Text><Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>2</Text></Card><Card style={{ flex: 1 }}><Text style={{ color: colors.muted, fontSize: 12 }}>Upcoming sessions</Text><Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>{app.bookings.filter(b => b.status === "confirmed").length}</Text></Card></View>
    <Heading title="Assigned topics" small />
    <View style={{ flexDirection: "row", gap: 8 }}>{["Career", "Academics"].map(t => <Pressable key={t} onPress={() => setActive(t)}><Pill label={`${t}${active === t ? " ✓" : ""}`} tone={active === t ? "green" : "blue"} /></Pressable>)}</View>
    <Heading title="Discussion inbox" small subtitle="Only assigned-topic discussions should be available to this counsellor." />
    <Card><Pill label={active} /><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16 }}>Student discussion · Demo case</Text><Text style={{ color: colors.muted, lineHeight: 20 }}>A student is looking for help with {active.toLowerCase()} and wants to discuss their next steps.</Text><Field label="Reply (demo only)" value={message} onChangeText={setMessage} placeholder="Write a supportive response…" multiline /><Button title="Save reply" onPress={() => { if (!message.trim()) return Alert.alert("Write a reply", "Enter a response first."); Alert.alert("Reply saved", "This is a local demo action; no student is notified."); setMessage(""); }} /></Card>
    <Heading title="Appointments" small />
    {app.bookings.filter(b => b.status === "confirmed").map(b => <Card key={b.id}><Text style={{ color: colors.ink, fontWeight: "800" }}>{b.counsellor}</Text><Text style={{ color: colors.muted }}>{b.date} · {b.time} · {b.topic}</Text><Pill label="Confirmed" tone="green" /></Card>)}
    <Button title="Open student demo" variant="secondary" onPress={() => router.push("/(student)")} />
  </Screen>;
}
