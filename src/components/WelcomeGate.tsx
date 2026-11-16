import React from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
import { Button } from "@/src/components/UI";

type Step = { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; body: string };

const MEMBER_STEPS: Step[] = [
  { icon: "compass-outline", title: "Explore resources and scholarships", body: "Practical guides and funding opportunities, ready to read." },
  { icon: "chatbubble-ellipses-outline", title: "Talk to a counsellor", body: "Start a private discussion; we match you with a counsellor for your topic." },
  { icon: "calendar-outline", title: "Book a session", body: "Pick a topic and a time and we will find a counsellor who is free." },
];
const COUNSELLOR_STEPS: Step[] = [
  { icon: "pricetags-outline", title: "Check your topics", body: "Administrators assign the topics you support." },
  { icon: "toggle-outline", title: "Set yourself to Available", body: "Discussions are assigned to you only while you are available, up to five at a time." },
  { icon: "notifications-outline", title: "Watch your notifications", body: "New assignments and appointment requests appear in the bell." },
];
const ADMIN_STEPS: Step[] = [
  { icon: "people-outline", title: "Manage people", body: "Invite counsellors, assign topics and review accounts." },
  { icon: "library-outline", title: "Manage content", body: "Edit the starter resources and scholarships or publish your own." },
  { icon: "shield-checkmark-outline", title: "Review activity", body: "Moderate ratings and follow the audit log." },
];

/**
 * One-time welcome shown after a person's first successful sign-in. The server stores when it was dismissed,
 * so it never returns on later sign-ins or on another device.
 */
export function WelcomeGate() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const user = app.user;
  const visible = !!user && !user.welcomeSeenAt;
  if (!visible || !user) return null;

  const first = user.name.split(" ")[0] || "there";
  const isMember = user.role === "member" || user.role === "student";
  const steps = isMember ? MEMBER_STEPS : user.role === "counsellor" ? COUNSELLOR_STEPS : ADMIN_STEPS;
  const focus = user.subcategoryName || user.categoryName;
  const intro = isMember
    ? focus ? `We’ve shaped your space around ${focus}. Here is how to make the most of it.` : "Here is how to make the most of your space."
    : user.role === "counsellor" ? "Thank you for supporting members. Here is how your workspace works." : "Here is a quick tour of your admin tools.";

  const done = (to?: "/(student)/explore" | "/(student)/counselling") => {
    void app.dismissWelcome();
    if (to && isMember) router.push(to);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => done()}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
        <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", overflow: "hidden" }}>
          <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }} bounces={false}>
            <Image source={require("../../assets/welcome/mentor-session.jpg")} accessibilityIgnoresInvertColors accessibilityLabel="A mentor talking with a small group in a bright office" style={{ width: "100%", aspectRatio: 1000 / 667 }} resizeMode="cover" />
            <View style={{ padding: 22, gap: 14 }}>
              <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.6 }}>Welcome to Mentorship+, {first}.</Text>
              <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>{intro}</Text>
              <View style={{ gap: 12, marginTop: 4 }}>
                {steps.map(step => (
                  <View key={step.title} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.accentTint, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={step.icon} size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 15 }}>{step.title}</Text>
                      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{step.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={{ gap: 10, marginTop: 8 }}>
                {isMember ? (
                  <>
                    <Button title="Explore resources" icon="compass-outline" onPress={() => done("/(student)/explore")} />
                    <Button title="Talk to a counsellor" icon="chatbubble-ellipses-outline" variant="secondary" onPress={() => done("/(student)/counselling")} />
                    <Pressable accessibilityRole="button" onPress={() => done()} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: colors.muted, fontWeight: "700" }}>Maybe later</Text>
                    </Pressable>
                  </>
                ) : (
                  <Button title="Get started" onPress={() => done()} />
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
