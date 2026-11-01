import React, { useState } from "react";
import { Text, View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Pill } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
export default function Counselling() {
  const app = useApp(); const [topic, setTopic] = useState("Career");
  const go = (slug: string) => router.push({ pathname: "/feature/[slug]", params: { slug } });
  const eligible = app.counsellors.filter(c => c.topics.includes(topic));
  return <Screen>
    <Heading title="You don’t have to do it alone" subtitle="Choose the kind of support that feels right for you." />
    <Pressable onPress={() => go("ai")}><Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}><Text style={{ color: "#B8F2E8", fontWeight: "800" }}>AI COUNSELLOR</Text><Text style={{ color: "#fff", fontWeight: "900", fontSize: 20 }}>Talk it through, anytime.</Text><Text style={{ color: "#E1EDF5" }}>Explore study plans, career questions, or general wellbeing with demo AI responses.</Text><Text style={{ color: "#B8F2E8", fontWeight: "800" }}>Start a conversation →</Text></Card></Pressable>
    <Heading title="Talk to a human counsellor" small subtitle="Choose a topic to find an eligible counsellor." />
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{app.topics.map(t => <Pressable key={t} onPress={() => setTopic(t)}><View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: topic === t ? colors.primary : "#fff", borderWidth: 1, borderColor: topic === t ? colors.primary : colors.line }}><Text style={{ color: topic === t ? "#fff" : colors.ink, fontWeight: "700" }}>{t}</Text></View></Pressable>)}</View>
    {eligible.length ? eligible.map(c => <Card key={c.id}><View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.softBlue, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 20 }}>☺</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16 }}>{c.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{c.availability}</Text></View><Pill label="Demo" /></View><Text style={{ color: colors.muted, lineHeight: 20 }}>{c.bio}</Text><Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>Topics: {c.topics.join(", ")}</Text><Button title="Start private discussion" onPress={() => { Alert.alert("Discussion started", `Demo discussion with ${c.name} for ${topic}. Messages can be tested in the discussion screen.`, [{ text: "Continue", onPress: () => go("discussion") }]); }} /></Card>) : <Card><Text style={{ color: colors.ink, fontWeight: "800" }}>No counsellor available for {topic}</Text><Text style={{ color: colors.muted }}>Try another topic or return later. The app will not route you to an unrelated counsellor.</Text></Card>}
    <Button title="Book an appointment" onPress={() => go("booking")} variant="secondary" />
    <Button title="My discussions" onPress={() => go("discussion")} variant="ghost" />
  </Screen>;
}
