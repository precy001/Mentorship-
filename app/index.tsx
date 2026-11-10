import React, { useEffect, useRef } from "react";
import { Animated, Image, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Button } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";

export default function Welcome() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const rise = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 11, bounciness: 5, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale, rise]);

  return (
    <Screen scroll={false} style={{ flex: 1, paddingTop: 22, paddingBottom: 22, gap: 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", gap: 20 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <Image source={require("../assets/guidance-logo.png")} style={{ width: 46, height: 46, borderRadius: 13 }} resizeMode="cover" />
        <View>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 }}>Mentorship+</Text>
          <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 2 }}>SPACE TO GROW</Text>
        </View>
      </View>

      <Animated.View style={{ alignItems: "center", paddingHorizontal: 12, opacity, transform: [{ scale }, { translateY: rise }] }}>
        <View style={{ width: 154, height: 154, borderRadius: 43, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", marginBottom: 34, shadowColor: colors.primary, shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 10 }}>
          <Image source={require("../assets/guidance-logo.png")} style={{ width: 142, height: 142, borderRadius: 38 }} resizeMode="cover" />
        </View>
        <Text style={{ color: colors.ink, fontSize: 34, lineHeight: 41, letterSpacing: -1.2, fontWeight: "700", textAlign: "center" }}>Your next chapter{ "\n" }starts here.</Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 15, maxWidth: 310 }}>A thoughtful space for learning, career discovery, wellbeing, and support.</Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 25 }}><View style={{ width: 24, height: 5, borderRadius: 5, backgroundColor: colors.primary }} /><View style={{ width: 6, height: 5, borderRadius: 5, backgroundColor: "#C9D7D7" }} /><View style={{ width: 6, height: 5, borderRadius: 5, backgroundColor: "#C9D7D7" }} /></View>
      </Animated.View>
      </ScrollView>

      <View style={{ gap: 12, paddingTop: 16 }}>
        <Button title="Get started" onPress={() => router.push("/auth?mode=signup")} />
        <Button title="I already have an account" variant="secondary" onPress={() => router.push("/auth?mode=signin")} />
        <Text style={{ color: colors.mutedLight, fontSize: 11, textAlign: "center", marginTop: 3 }}>A little guidance. A clearer tomorrow.</Text>
      </View>
    </Screen>
  );
}
