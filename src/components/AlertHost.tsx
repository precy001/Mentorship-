import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, BackHandler, Easing, Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/lib/theme";
import { closeAlert, useCurrentAlert, type AlertTone, type AppAlertButton } from "@/src/lib/alert";

const TONES: Record<AlertTone, { icon: React.ComponentProps<typeof Ionicons>["name"]; fg: string; bg: string }> = {
  success: { icon: "checkmark-circle", fg: colors.success, bg: colors.successBg },
  error: { icon: "alert-circle", fg: colors.error, bg: colors.errorBg },
  warning: { icon: "information-circle", fg: colors.warning, bg: colors.warningBg },
  info: { icon: "information-circle", fg: colors.primary, bg: colors.accentTint },
  confirm: { icon: "help-circle", fg: colors.primary, bg: colors.accentTint },
  danger: { icon: "warning", fg: colors.error, bg: colors.errorBg },
};

/**
 * Renders Mentorship+ dialogs (see src/lib/alert.ts) above every screen. It is a plain overlay rather than a
 * system Modal, so it never clashes with screen transitions and looks identical on Android and iOS.
 * Mounted once in app/_layout.tsx.
 */
export function AlertHost() {
  const alert = useCurrentAlert();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!alert) return;
    Keyboard.dismiss();
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    AccessibilityInfo.announceForAccessibility([alert.title, alert.message].filter(Boolean).join(". "));
  }, [alert?.id]);

  const cancelButton = alert?.buttons.find((button) => button.style === "cancel");
  const singleButton = alert && alert.buttons.length === 1 ? alert.buttons[0] : undefined;

  // Android Back behaves like the system dialog: it presses Cancel (or the only button), otherwise it is ignored.
  useEffect(() => {
    if (!alert) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (cancelButton) closeAlert(alert.id, cancelButton);
      else if (singleButton) closeAlert(alert.id, singleButton);
      else if (alert.options.cancelable) closeAlert(alert.id);
      return true;
    });
    return () => sub.remove();
  }, [alert, cancelButton, singleButton]);

  if (!alert) return null;
  const tone = TONES[alert.tone];
  // Cancel always sits apart from the action: on the left when side by side, last when stacked.
  const ordered = [...alert.buttons.filter((button) => button.style !== "cancel"), ...alert.buttons.filter((button) => button.style === "cancel")];
  const sideBySide = ordered.length === 2 && ordered.every((button) => (button.text ?? "OK").length <= 16);
  const rowOrder = sideBySide ? [...ordered].reverse() : ordered;

  const renderButton = (button: AppAlertButton, index: number) => {
    const label = button.text ?? "OK";
    const cancel = button.style === "cancel";
    const destructive = button.style === "destructive";
    // The main action is filled; Cancel and any extra options are outlined.
    const primary = !cancel && (destructive || ordered.indexOf(button) === 0);
    const fill = destructive ? colors.error : colors.primary;
    return (
      <Pressable
        key={`${label}-${index}`}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => closeAlert(alert.id, button)}
        style={({ pressed }) => [
          styles.button,
          sideBySide && { flex: 1 },
          primary ? { backgroundColor: fill, borderColor: fill } : { backgroundColor: colors.surface, borderColor: colors.line },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.buttonText, { color: primary ? colors.white : cancel ? colors.muted : destructive ? colors.error : colors.primaryDark }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={() => { if (alert.options.cancelable) closeAlert(alert.id); }}
        />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[styles.card, { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon} size={30} color={tone.fg} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>{alert.title}</Text>
          {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}
          <View style={[styles.buttons, sideBySide && { flexDirection: "row" }]}>{rowOrder.map(renderButton)}</View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(15,23,42,0.5)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 16,
  },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: "800", letterSpacing: -0.3, textAlign: "center" },
  message: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: "center" },
  buttons: { alignSelf: "stretch", gap: 10, marginTop: 10 },
  button: { minHeight: 50, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { fontSize: 15, fontWeight: "800" },
});
