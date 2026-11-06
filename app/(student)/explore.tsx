import React, { useState } from "react";
import { Text, View, Pressable, TextInput } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Pill } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
export default function Explore() {
  const app = useApp(); const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"resources" | "scholarships" | "universities">("resources");
  const go = (slug: string) => router.push({ pathname: "/feature/[slug]", params: { slug } });
  const list = tab === "resources" ? app.resources : tab === "scholarships" ? app.scholarships : [
    { id: "u1", title: "University of Lagos", category: "Akoka, Lagos", description: "Check official channels for current admissions information." },
    { id: "u2", title: "University of Ibadan", category: "Ibadan, Oyo", description: "Confirm courses and requirements through official sources." },
    { id: "u3", title: "Ahmadu Bello University", category: "Zaria, Kaduna", description: "Confirm current admission details independently." }
  ];
  const filtered = list.filter((x: any) => `${x.title} ${x.category || x.level || ""} ${x.description}`.toLowerCase().includes(query.toLowerCase()));
  return <Screen>
    <Heading title="Explore your possibilities" subtitle="Useful knowledge, funding opportunities, and places to learn." />
    <TextInput value={query} onChangeText={setQuery} placeholder="Search resources, scholarships…" placeholderTextColor="#9AA5B5" style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 14, color: colors.ink }} />
    <View style={{ flexDirection: "row", gap: 8 }}>{(["resources", "scholarships", "universities"] as const).map(t => <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: tab === t ? colors.primary : "#fff", alignItems: "center" }}><Text style={{ color: tab === t ? "#fff" : colors.ink, fontWeight: "700", fontSize: 11, textTransform: "capitalize" }}>{t}</Text></Pressable>)}</View>
    {filtered.map((item: any) => {
      const saved = tab === "resources" ? app.savedResources.includes(item.id) : app.savedScholarships.includes(item.id);
      return <Card key={item.id}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Pill label={item.category || item.level || "University"} /><Pressable onPress={() => tab === "resources" ? app.toggleResource(item.id) : tab === "scholarships" ? app.toggleScholarship(item.id) : go("universities")}><Text style={{ color: colors.primary, fontWeight: "800" }}>{tab !== "universities" ? (saved ? "♥ Saved" : "♡ Save") : "Details →"}</Text></Pressable></View>
        <Text style={{ color: colors.ink, fontSize: 17, fontWeight: "800" }}>{item.title}</Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>{item.description}</Text>
        {item.deadline && <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Deadline: {item.deadline}</Text>}
        {tab === "scholarships" && <Text style={{ color: colors.muted, fontSize: 11 }}>Check eligibility and deadlines directly with the scholarship provider before applying.</Text>}
      </Card>;
    })}
    {filtered.length === 0 && <Card><Text style={{ color: colors.ink, fontWeight: "800" }}>Nothing found</Text><Text style={{ color: colors.muted }}>Try a different search term.</Text></Card>}
    <Pressable onPress={() => go("saved")}><Text style={{ color: colors.primary, fontWeight: "800", textAlign: "center", padding: 10 }}>View saved resources and scholarships →</Text></Pressable>
  </Screen>;
}
