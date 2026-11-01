import React from "react";
import { Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Pill } from "@/src/components/UI";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
export default function Activities() {
  const app = useApp(); const go = (slug: string) => router.push({ pathname: "/feature/[slug]", params: { slug } });
  const items = [
    ["Career assessment", "Understand your interests and explore career matches.", "assessment", "◎"],
    ["Wellbeing check-in", "Pause, name how you feel, and keep track over time.", "wellness", "♡"],
    ["Personal goals", "Build small routines and celebrate progress.", "goals", "✓"],
    ["My appointments", "View or manage upcoming counselling sessions.", "booking", "◷"],
    ["Notifications", "See reminders and updates in one place.", "notifications", "♧"]
  ];
  return <Screen><Heading title="Activities" subtitle="Small actions that can help you move forward." />
    {items.map(([title, desc, slug, icon]) => <Pressable key={slug} onPress={() => go(slug)}><Card><Text style={{ fontSize: 23 }}>{icon}</Text><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17 }}>{title}</Text><Text style={{ color: colors.muted, lineHeight: 20 }}>{desc}</Text><Text style={{ color: colors.primary, fontWeight: "800" }}>Open activity →</Text>{slug === "assessment" && app.assessmentDone && <Pill label="Completed once" tone="green" />}</Card></Pressable>)}
  </Screen>;
}
