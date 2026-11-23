import React from "react";
import { Text, View } from "react-native";
import { Screen, Heading, BackLink, Card, IconBadge } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { leaveScreen } from "@/src/lib/routes";
import { useApp } from "@/src/context/AppContext";

/**
 * Policy & Guidelines. Intentionally empty for now: the content is still being written. The screen exists so the
 * links to it are in place everywhere; when the text is ready it goes here (or is loaded from the server, so it
 * can change without an app update).
 */
export default function PoliciesScreen() {
  const app = useApp();
  return (
    <Screen>
      <BackLink onPress={() => leaveScreen(app.user?.role)} />
      <Heading title="Policy & Guidelines" subtitle="How Mentorship+ works, and what we expect from everyone who uses it." />
      <Card style={{ alignItems: "center", gap: 12, paddingVertical: 32 }}>
        <IconBadge icon="document-text-outline" size={56} />
        <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16 }}>Coming soon</Text>
        <View style={{ maxWidth: 320 }}>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" }}>Our policies and community guidelines will be published here.</Text>
        </View>
      </Card>
    </Screen>
  );
}
