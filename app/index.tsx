import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, LayoutChangeEvent, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, shadows } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";

/** Splash-only tokens: a clean white canvas, the Mentorship+ blue, and the fresh green from the logo's "+". */
const CANVAS = "#FFFFFF";
const HALO_OUTER = "#F4F5FF";
const HALO_INNER = "#E9ECFF";
const LOGO_GREEN = "#22C55E";
const MAX_WIDTH = 480;

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const CHIPS: { icon: IconName; label: string; tint: string; color: string }[] = [
  { icon: "chatbubble-ellipses", label: "Counsellors", tint: colors.accentTint, color: colors.primary },
  { icon: "book", label: "Resources", tint: "#DCFCE7", color: colors.success },
  { icon: "school", label: "Scholarships", tint: colors.accentTint, color: colors.primary },
];

/**
 * Splash / welcome screen. It never blocks: the session check runs in parallel and everyone else can tap a
 * button the moment the screen appears. When a saved session is restored, the root layout swaps this screen
 * for the person's dashboard (see app/_layout.tsx), so this screen does not navigate on its own.
 */
export default function Welcome() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const restoring = app.sessionLoading || !!app.user;
  const compact = height < 700;

  // ---- Motion ----
  const halo = useRef(new Animated.Value(0)).current;
  const tile = useRef(new Animated.Value(0)).current;
  const chips = useRef(CHIPS.map(() => new Animated.Value(0))).current;
  const copy = useRef(new Animated.Value(0)).current;
  const actions = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => { if (active) setReduceMotion(enabled); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      [halo, tile, copy, actions, ...chips].forEach(v => v.setValue(1));
      return;
    }
    const t = (v: Animated.Value, duration: number, delay = 0, easing = Easing.out(Easing.cubic)) =>
      Animated.timing(v, { toValue: 1, duration, delay, easing, useNativeDriver: true });
    const entrance = Animated.parallel([
      t(halo, 800),
      t(tile, 650, 120, Easing.out(Easing.back(1.3))),
      ...chips.map((v, i) => t(v, 520, 380 + i * 110)),
      t(copy, 520, 300),
      t(actions, 520, 440),
    ]);
    entrance.start();
    // Very gentle idle float on the chips; native-driven and stopped when the screen unmounts.
    const drift = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    drift.start();
    return () => { entrance.stop(); drift.stop(); };
  }, [reduceMotion, halo, tile, chips, copy, actions, float]);

  useEffect(() => {
    if (!restoring || reduceMotion) return;
    sweep.setValue(0);
    const loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [restoring, reduceMotion, sweep]);

  // ---- Hero geometry: a square that fits the space left over, so it suits any Android screen ----
  const [hero, setHero] = useState({ w: 0, h: 0 });
  const onHeroLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setHero(prev => (Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w, h }));
  };
  const S = Math.min(hero.w, hero.h);
  const tileSize = Math.max(84, Math.min(116, S * 0.34));
  const cy = S * 0.42;
  const chipPos = [
    { left: S * 0.02, top: S * 0.03 },
    { right: S * 0.0, top: S * 0.63 },
    { left: S * 0.05, top: S * 0.81 },
  ];

  const rise = (v: Animated.Value, distance: number) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  });
  const headline = compact ? 31 : 36;

  return (
    <View style={{ flex: 1, backgroundColor: CANVAS }}>
      <StatusBar style="dark" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false} overScrollMode="never">
        <View style={{ flex: 1, width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: 24, paddingTop: insets.top + 14, paddingBottom: Math.max(insets.bottom, 16) + 10 }}>
          {/* Brand bar */}
          <View accessibilityRole="header" accessible accessibilityLabel="Mentorship+, space to grow" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Image source={require("../assets/guidance-logo.png")} style={{ width: 34, height: 34, borderRadius: 11 }} resizeMode="cover" accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 }}>Mentorship<Text style={{ color: colors.primary }}>+</Text></Text>
            </View>
            <View style={{ backgroundColor: colors.brandSurface, borderWidth: 1, borderColor: colors.brandBorder, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 5 }}>
              <Text style={{ color: colors.primaryDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }}>SPACE TO GROW</Text>
            </View>
          </View>

          {/* Hero: the logo on soft concentric halos with floating feature chips (no photography) */}
          <View onLayout={onHeroLayout} style={{ flex: 1, minHeight: 280, maxHeight: 420, marginTop: compact ? 6 : 14, alignItems: "center" }}>
            {S > 0 && (
              <View style={{ width: S, height: S }}>
                <Animated.View pointerEvents="none" style={{ position: "absolute", left: S / 2 - S * 0.5, top: cy - S * 0.5, width: S, height: S, borderRadius: S, backgroundColor: HALO_OUTER, opacity: halo, transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }} />
                <Animated.View pointerEvents="none" style={{ position: "absolute", left: S / 2 - S * 0.35, top: cy - S * 0.35, width: S * 0.7, height: S * 0.7, borderRadius: S, backgroundColor: HALO_INNER, opacity: halo, transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }} />

                <Animated.View style={{ position: "absolute", left: S / 2 - tileSize / 2, top: cy - tileSize / 2, width: tileSize, height: tileSize, opacity: tile, transform: [{ scale: tile.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }], shadowColor: colors.primary, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.35, shadowRadius: 22, elevation: 12, borderRadius: tileSize * 0.28, backgroundColor: colors.primary }}>
                  <Image source={require("../assets/guidance-logo.png")} style={{ width: "100%", height: "100%", borderRadius: tileSize * 0.28 }} resizeMode="cover" accessibilityElementsHidden importantForAccessibility="no" />
                </Animated.View>

                {CHIPS.map((chip, i) => (
                  <Animated.View
                    key={chip.label}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      { position: "absolute", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 99, paddingVertical: 7, paddingLeft: 7, paddingRight: 14, ...shadows.raised },
                      chipPos[i],
                      {
                        opacity: chips[i],
                        transform: [
                          { translateY: chips[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                          { translateY: float.interpolate({ inputRange: [0, 1], outputRange: i % 2 === 0 ? [0, -4] : [0, 4] }) },
                        ],
                      },
                    ]}
                  >
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: chip.tint, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={chip.icon} size={14} color={chip.color} />
                    </View>
                    <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "700" }}>{chip.label}</Text>
                  </Animated.View>
                ))}

                {/* Small accent from the logo's "+" */}
                <Animated.View pointerEvents="none" style={{ position: "absolute", right: S * 0.14, top: cy - S * 0.3, width: 12, height: 12, borderRadius: 6, backgroundColor: LOGO_GREEN, opacity: halo }} />
              </View>
            )}
          </View>

          {/* Message */}
          <Animated.View style={[{ marginTop: compact ? 14 : 22, gap: 10 }, rise(copy, 14)]}>
            <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: headline, lineHeight: Math.round(headline * 1.12), letterSpacing: -1.2, fontWeight: "800" }}>
              Your next chapter{"\n"}<Text style={{ color: colors.primary }}>starts here.</Text>
            </Text>
            <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23, maxWidth: 340 }}>Learning, career discovery, wellbeing and real counsellors, together in one thoughtful space.</Text>
          </Animated.View>

          {/* Actions */}
          <Animated.View style={[{ marginTop: compact ? 18 : 26, gap: 12 }, rise(actions, 12)]}>
            {restoring ? (
              <View accessibilityRole="progressbar" accessibilityLabel={app.user ? "Opening your space" : "Checking your session"} style={{ minHeight: 120, justifyContent: "center", gap: 14 }}>
                <View onLayout={e => setTrackWidth(e.nativeEvent.layout.width)} style={{ height: 3, borderRadius: 2, backgroundColor: colors.accentTint, overflow: "hidden" }}>
                  <Animated.View style={{ width: "38%", height: 3, borderRadius: 2, backgroundColor: colors.primary, transform: [{ translateX: reduceMotion || !trackWidth ? 0 : sweep.interpolate({ inputRange: [0, 1], outputRange: [-trackWidth * 0.38, trackWidth] }) }] }} />
                </View>
                <Text style={{ color: colors.muted, fontSize: 13, letterSpacing: 0.2 }}>{app.user ? "Opening your space…" : "Checking your session…"}</Text>
              </View>
            ) : (
              <View style={{ minHeight: 120, gap: 12 }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Get started" onPress={() => router.push("/auth?mode=signup")} android_ripple={{ color: "rgba(255,255,255,0.2)" }} style={({ pressed }) => ({ height: 56, borderRadius: 18, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 24, paddingRight: 10, opacity: pressed ? 0.92 : 1, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 5 })}>
                  <Text style={{ color: colors.white, fontSize: 16, fontWeight: "800", letterSpacing: -0.1 }}>Get started</Text>
                  <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="arrow-forward" size={19} color={colors.white} />
                  </View>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="I already have an account" onPress={() => router.push("/auth?mode=signin")} android_ripple={{ color: "rgba(41,55,245,0.08)" }} style={({ pressed }) => ({ height: 52, borderRadius: 18, backgroundColor: colors.brandSurface, borderWidth: 1, borderColor: colors.brandBorder, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}>
                  <Text style={{ color: colors.primaryDark, fontSize: 15, fontWeight: "700" }}>I already have an account</Text>
                </Pressable>
              </View>
            )}
            <Text style={{ color: colors.mutedLight, fontSize: 12, textAlign: "center", letterSpacing: 0.3 }}>A little guidance. A clearer tomorrow.</Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
