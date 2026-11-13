import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Field, Pill, Row } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
export default function AdminDashboard() {
  const app = useApp(); const [newTopic, setNewTopic] = useState(""); const [resourceTitle, setResourceTitle] = useState(""); const [resourceDesc, setResourceDesc] = useState(""); const [schTitle, setSchTitle] = useState(""); const [deadline, setDeadline] = useState("2027-02-01");
  const lgas = ["Lagos Mainland", "Ikeja", "Surulere", "Kano Municipal", "Eti-Osa", "Ibadan North"];
  return <Screen>
    <Text onPress={() => Alert.alert("Sign out?", "Return to role selection?", [{ text: "Stay", style: "cancel" }, { text: "Sign out", onPress: async () => { await app.logout(); router.replace({ pathname: "/auth", params: { mode: "signin", signedOut: "1" } }); } }])} style={{ color: colors.primary, fontWeight: "800" }}>← Sign out</Text>
    <Heading title="Admin dashboard" subtitle={`Platform operations · ${app.user?.name || "Administrator"}`} />
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}><Text style={{ color: "#B8F2E8", fontWeight: "800" }}>MENTORSHIP+ ADMIN</Text><Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>A clearer view of support.</Text><Text style={{ color: "#E1EDF5" }}>Manage demo access, topics and educational content. Changes persist locally on this device.</Text></Card>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{[
      ["Authorised LGAs", app.authorisedLgas.length], ["Counsellors", app.counsellors.length], ["Topics", app.topics.length], ["Resources", app.resources.length], ["Scholarships", app.scholarships.length], ["Appointments", app.bookings.length]
    ].map(([label, value]) => <Card key={String(label)} style={{ width: "47%", flexGrow: 1 }}><Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text><Text style={{ color: colors.ink, fontSize: 25, fontWeight: "900" }}>{value}</Text></Card>)}</View>
    <Heading title="LGA access management" small subtitle="Toggle access for mock registration and login checks." />
    {lgas.map(lga => <Card key={lga}><Row style={{ justifyContent: "space-between" }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{lga}</Text><Pill label={app.authorisedLgas.includes(lga) ? "Authorised" : "Not authorised"} tone={app.authorisedLgas.includes(lga) ? "green" : "red"} /></View><Button title={app.authorisedLgas.includes(lga) ? "Revoke" : "Authorise"} variant={app.authorisedLgas.includes(lga) ? "ghost" : "secondary"} onPress={() => Alert.alert(`${app.authorisedLgas.includes(lga) ? "Revoke" : "Authorise"} ${lga}?`, "This updates the local mock access list.", [{ text: "Cancel", style: "cancel" }, { text: "Confirm", onPress: () => app.toggleLga(lga) }])} /></Row></Card>)}
    <Heading title="Topic management" small subtitle="Add configurable discussion topics." />
    <Card><Field label="New topic" value={newTopic} onChangeText={setNewTopic} placeholder="e.g. Financial wellbeing" /><Button title="Add topic" onPress={() => { if (!newTopic.trim()) return Alert.alert("Topic required", "Enter a topic name."); app.addTopic(newTopic.trim()); setNewTopic(""); }} />{app.topics.map(t => <Pill key={t} label={t} />)}</Card>
    <Heading title="Resource management" small />
    <Card><Field label="Resource title" value={resourceTitle} onChangeText={setResourceTitle} placeholder="Title" /><Field label="Description" value={resourceDesc} onChangeText={setResourceDesc} placeholder="Short summary" multiline /><Button title="Add resource" onPress={() => { if (!resourceTitle.trim() || !resourceDesc.trim()) return Alert.alert("Complete both fields", "A title and description are required."); app.addResource(resourceTitle.trim(), resourceDesc.trim()); setResourceTitle(""); setResourceDesc(""); Alert.alert("Resource added", "It is now available in the Explore resource list."); }} /></Card>
    <Heading title="Scholarship management" small />
    <Card><Field label="Scholarship title" value={schTitle} onChangeText={setSchTitle} placeholder="Title" /><Field label="Deadline (YYYY-MM-DD)" value={deadline} onChangeText={setDeadline} placeholder="2027-02-01" /><Button title="Add sample scholarship" onPress={() => { if (!schTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return Alert.alert("Check the fields", "Enter a title and deadline in YYYY-MM-DD format."); app.addScholarship(schTitle.trim(), deadline); setSchTitle(""); Alert.alert("Scholarship added", "A mock listing has been added to Explore."); }} /></Card>
    <Heading title="Counsellor roster" small />
    {app.counsellors.map(c => <Card key={c.id}><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{c.name}</Text><Pill label="Active" tone="green" /></Row><Text style={{ color: colors.muted }}>Assigned topics: {c.topics.join(", ")}</Text></Card>)}
    <Button title="Open student experience" variant="secondary" onPress={() => router.push("/(student)")} />
    <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17 }}>Privacy note: private journal entries are excluded from admin analytics. Access to sensitive records must remain server-authorised.</Text>
  </Screen>;
}
