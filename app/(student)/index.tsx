import React from "react";
import { Alert, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, Card, Row, Pill } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";

export default function StudentHome() {
  const app = useApp();
  const name = app.user?.name?.split(" ")[0] || "there";
  const go = (slug: string) => slug === "counselling" ? router.push("/(student)/counselling") : slug === "scholarships" ? router.push({ pathname: "/(student)/explore", params: { tab: "scholarships" } }) : slug === "explore" ? router.push("/(student)/explore") : router.push({ pathname: "/feature/[slug]", params: { slug } });
  const categorySlug = app.user?.categorySlug || "";
  const isEducation = categorySlug === "education-learning";
  const isCareer = categorySlug === "work-career";
  const subcategorySlug = app.user?.subcategorySlug || "";
  const isBusinessFocused = ["self-employed-business-owner", "artisan-skilled-tradesperson", "freelancer-gig-worker"].includes(subcategorySlug);
  const focusLabel = app.user?.subcategoryName || app.user?.categoryName || "your next step";
  const quick = [
    ...(isEducation ? [{ title: "Learning resources", slug: "resources", icon: "book-outline" as const }, { title: "Scholarships", slug: "scholarships", icon: "school-outline" as const }] : []),
    ...(isCareer ? [isBusinessFocused ? { title: "Business guidance", slug: "business", icon: "briefcase-outline" as const } : { title: "Career growth", slug: "career", icon: "trending-up-outline" as const }] : []),
    ...(!isEducation && !isCareer ? [{ title: "Explore opportunities", slug: "explore", icon: "compass-outline" as const }] : []),
    { title: "Speak to a counsellor", slug: "counselling", icon: "chatbubble-ellipses-outline" as const },
    { title: "Book appointment", slug: "booking", icon: "calendar-outline" as const },
  ];

  return (
    <Screen>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ gap: 5, flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }}>YOUR SPACE TO GROW</Text>
          <Text style={{ color: colors.ink, fontSize: 27, fontWeight: "800", letterSpacing: -0.7 }}>Hello, {name}.</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{`A space shaped around ${focusLabel}.`}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => go("notifications")} style={({ pressed }) => ({ width: 46, height: 46, backgroundColor: colors.surface, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="notifications-outline" size={21} color={colors.ink} />
          {app.notifications.some(n => !n.read) && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, position: "absolute", right: 10, top: 9, borderWidth: 1.5, borderColor: colors.white }} />}
        </Pressable>
      </Row>

      <Card style={{ backgroundColor: colors.navy, borderColor: colors.navy, padding: 22, borderRadius: 25, gap: 14 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={{ color: "#99F6E4", fontWeight: "800", fontSize: 11, letterSpacing: 1.25 }}>A THOUGHT FOR TODAY</Text>
          <Ionicons name="sparkles-outline" size={20} color={colors.champagne} />
        </Row>
        <Text style={{ color: colors.white, fontWeight: "800", fontSize: 23, lineHeight: 30, letterSpacing: -0.45 }}>Small steps still move you forward.</Text>
        <Text style={{ color: "#CBD5E1", lineHeight: 22, fontSize: 14 }}>You don’t have to figure everything out at once. Start with one thing you can do today.</Text>
        <Pressable onPress={() => go("wellness")} style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingTop: 2 }}>
          <Text style={{ color: "#99F6E4", fontWeight: "800", fontSize: 13 }}>Check in with yourself</Text>
          <Ionicons name="arrow-forward" size={16} color="#99F6E4" />
        </Pressable>
      </Card>

      <Heading title="What do you need today?" small subtitle="Choose a place to start." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 11 }}>
        {quick.map(({ title, slug, icon }) => (
          <Pressable key={slug} onPress={() => go(slug)} style={({ pressed }) => ({ width: "48%", flexGrow: 1, minHeight: 130, backgroundColor: colors.surface, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: "#E7ECF4", justifyContent: "space-between", gap: 16, shadowColor: colors.navy, shadowOpacity: pressed ? 0.02 : 0.045, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: pressed ? 1 : 2, transform: [{ scale: pressed ? 0.985 : 1 }], opacity: pressed ? 0.92 : 1 })}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentTint, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={icon} size={21} color={colors.primary} />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.ink, fontWeight: "800", lineHeight: 19 }}>{title}</Text>
              <Row style={{ gap: 5 }}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>Explore</Text><Ionicons name="arrow-forward" size={13} color={colors.primary} /></Row>
            </View>
          </Pressable>
        ))}
      </View>

      <Row style={{ justifyContent: "space-between" }}>
        <Heading title="Your next steps" small />
        <Pill label={`${app.goals.filter(g => g.done).length}/${app.goals.length} done`} tone="green" />
      </Row>
      <Card>
        {app.goals.slice(0, 3).map((g, i) => (
          <Pressable key={g.id} onPress={() => { void app.toggleGoal(g.id).catch(error => Alert.alert("Goal not updated", error instanceof Error ? error.message : "Please try again.")); }} style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 7, borderBottomWidth: i < Math.min(app.goals.length, 3) - 1 ? 1 : 0, borderBottomColor: colors.line }}>
            <Ionicons name={g.done ? "checkmark-circle" : "ellipse-outline"} size={21} color={g.done ? colors.primary : colors.mutedLight} />
            <Text style={{ color: colors.ink, textDecorationLine: g.done ? "line-through" : "none", flex: 1, lineHeight: 20 }}>{g.title}</Text>
          </Pressable>
        ))}
      </Card>

      <Heading title={isEducation ? "Learning opportunities" : isCareer ? "Career and business growth" : "Recommended for you"} small subtitle={`Selected for ${focusLabel.toLowerCase()}.`} />
      {(isEducation || !isCareer ? app.resources.slice(0, 2) : []).map(r => (
        <Pressable key={r.id} onPress={() => go("resources")}>
          <Card>
            <Pill label={r.category} />
            <Text style={{ color: colors.ink, fontSize: 17, fontWeight: "800", letterSpacing: -0.2 }}>{r.title}</Text>
            <Text style={{ color: colors.muted, lineHeight: 21 }}>{r.description}</Text>
            <Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted, fontSize: 12 }}>{r.readTime}</Text><Ionicons name="arrow-forward-circle-outline" size={22} color={colors.primary} /></Row>
          </Card>
        </Pressable>
      ))}
      {app.bookings.filter(b => ["requested", "confirmed", "rescheduled"].includes(b.status) && new Date(b.startsAt).getTime() > Date.now()).length > 0 && (
        <Card>
          <Heading title="Upcoming appointments" small />
          {app.bookings.filter(b => ["requested", "confirmed", "rescheduled"].includes(b.status) && new Date(b.startsAt).getTime() > Date.now()).map(b => <Text key={b.id} style={{ color: colors.ink }}>{b.topic} · {new Date(b.startsAt).toLocaleString()} · {b.status}</Text>)}
        </Card>
      )}
    </Screen>
  );
}
