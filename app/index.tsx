import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen, Button } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";

export default function Welcome() {
  const app = useApp();
  useEffect(() => {
    if (app.sessionLoading || !app.user) return;
    if (app.user.role === "admin" || app.user.role === "super_admin") router.replace("/(admin)");
    else if (app.user.role === "counsellor") router.replace("/(counsellor)");
    else router.replace("/(student)");
  }, [app.sessionLoading, app.user]);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.84)).current;
  const rise = useRef(new Animated.Value(22)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 10, bounciness: 4, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    const haloLoop = Animated.loop(Animated.sequence([
      Animated.timing(halo, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(halo, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    const floatLoop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));

    entrance.start();
    haloLoop.start();
    floatLoop.start();
    return () => {
      entrance.stop();
      haloLoop.stop();
      floatLoop.stop();
    };
  }, [opacity, scale, rise, halo, float]);

  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] });
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });
  const floatReverse = float.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });

  return (
    <Screen scroll={false} style={{ flex: 1, paddingTop: 22, paddingBottom: 22, gap: 0, overflow: "hidden" }}>
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", width: 270, height: 270, borderRadius: 135, backgroundColor: "#E9EDFF", top: 110, alignSelf: "center", opacity: 0.72, transform: [{ scale: haloScale }] }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", gap: 20 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
          <Image source={require("../assets/guidance-logo.png")} style={{ width: 46, height: 46, borderRadius: 14 }} resizeMode="cover" />
          <View>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 }}>Mentorship+</Text>
            <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 2 }}>SPACE TO GROW</Text>
          </View>
        </View>

        <Animated.View style={{ alignItems: "center", paddingHorizontal: 12, opacity, transform: [{ scale }, { translateY: rise }] }}>
          <View style={{ width: 210, height: 210, alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <Animated.View style={{ position: "absolute", width: 176, height: 176, borderRadius: 52, borderWidth: 1.5, borderColor: colors.primary, opacity: haloOpacity, transform: [{ scale: haloScale }] }} />
            <Animated.View style={{ position: "absolute", width: 166, height: 166, borderRadius: 48, backgroundColor: "#DDE3FF", opacity: 0.75, transform: [{ translateY: floatY }, { rotate: "-8deg" }] }} />
            <View style={{ width: 150, height: 150, borderRadius: 43, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 10 }}>
              <Image source={require("../assets/guidance-logo.png")} style={{ width: 138, height: 138, borderRadius: 38 }} resizeMode="cover" />
            </View>
            <Animated.View style={{ position: "absolute", right: 13, top: 25, width: 42, height: 42, borderRadius: 15, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4, transform: [{ translateY: floatReverse }] }}>
              <Ionicons name="sparkles" size={19} color={colors.primary} />
            </Animated.View>
            <Animated.View style={{ position: "absolute", left: 9, bottom: 27, width: 40, height: 40, borderRadius: 14, backgroundColor: "#DDF7F1", alignItems: "center", justifyContent: "center", transform: [{ translateY: floatY }] }}>
              <Ionicons name="leaf" size={18} color={colors.teal} />
            </Animated.View>
          </View>

          <View style={{ alignItems: "center", gap: 10 }}>
            <View style={{ backgroundColor: colors.accentTint, borderRadius: 99, paddingHorizontal: 13, paddingVertical: 7 }}>
              <Text style={{ color: colors.primaryDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 }}>LEARN  ·  CONNECT  ·  GROW</Text>
            </View>
            <Text style={{ color: colors.ink, fontSize: 34, lineHeight: 41, letterSpacing: -1.2, fontWeight: "800", textAlign: "center" }}>Your next chapter{"\n"}starts here.</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 13, maxWidth: 310 }}>A thoughtful space for learning, career discovery, wellbeing, and support.</Text>
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
