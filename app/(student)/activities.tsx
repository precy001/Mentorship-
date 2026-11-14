import React from "react";
import { Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Pill } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
export default function Activities() {
  const go = (slug: string) => slug === "counselling" ? router.push("/(student)/counselling") : router.push({ pathname: "/feature/[slug]", params: { slug } });
  const items = [
    ["Career assessment", "Understand your interests and explore career matches.", "assessment", "◎"],
    ["Wellbeing check-in", "Pause, name how you feel, and keep track over time.", "wellness", "♡"],
    ["Personal goals", "Build small routines and celebrate progress.", "goals", "✓"],
    ["Counselling discussions", "Start or continue a private discussion with your assigned counsellor.", "counselling", "✉"],
    ["My appointments", "Request a session and manage upcoming or past appointments.", "booking", "◷"],
    ["Notifications", "See reminders and updates in one place.", "notifications", "♧"],
    ["Activity history", "Review your completed activities, check-ins, goals and appointments.", "history", "↗"]
  ];
  return <Screen><Heading title="Activities" subtitle="Small actions that can help you move forward." />
    {items.map(([title, desc, slug, icon]) => <Pressable key={slug} onPress={() => go(slug)}><Card><Text style={{ fontSize: 23 }}>{icon}</Text><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17 }}>{title}</Text><Text style={{ color: colors.muted, lineHeight: 20 }}>{desc}</Text><Text style={{ color: colors.primary, fontWeight: "800" }}>Open activity →</Text></Card></Pressable>)}
  </Screen>;
}
