import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ViewStyle,
  ScrollView,
} from "react-native";
import { colors, radii, spacing } from "@/src/lib/theme";

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  return scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.screen, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screen, { flex: 1 }, style]}>{children}</View>
  );
}

export function Heading({
  title,
  subtitle,
  small = false,
}: {
  title: string;
  subtitle?: string;
  small?: boolean;
}) {
  return (
    <View style={styles.headingWrap}>
      <Text accessibilityRole="header" style={[styles.heading, small && styles.headingSmall]}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      android_ripple={{
        color: variant === "primary" || variant === "danger" ? "rgba(255,255,255,0.16)" : "rgba(41,55,245,0.08)",
        borderless: false,
      }}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "secondary" && styles.secondaryText,
          variant === "ghost" && styles.ghostText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedLight}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

export function Pill({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "green" | "amber" | "red" | "purple";
}) {
  const bg = tone === "green" ? colors.successBg : tone === "amber" ? colors.warningBg : tone === "red" ? colors.errorBg : tone === "purple" ? "#F0EDFF" : colors.softBlue;
  const fg = tone === "green" ? colors.success : tone === "amber" ? colors.warning : tone === "red" ? colors.error : tone === "purple" ? colors.purple : colors.navy;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  screen: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 120,
    gap: 19,
    backgroundColor: colors.bg,
  },
  headingWrap: { gap: 7, marginBottom: 3 },
  heading: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.95,
  },
  headingSmall: { fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted, letterSpacing: 0.05 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 19,
    borderWidth: 1,
    borderColor: "#E8EDF4",
    gap: spacing.md,
    shadowColor: "#172554",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.055,
    shadowRadius: 16,
    elevation: 2,
  },
  button: {
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  secondary: { backgroundColor: "#EEF0FF", borderWidth: 1, borderColor: "#DCE1FF" },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: colors.error },
  buttonText: { color: colors.white, fontWeight: "800", fontSize: 14, letterSpacing: 0.2 },
  secondaryText: { color: colors.primaryDark },
  ghostText: { color: colors.ink },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  fieldWrap: { gap: 8, marginBottom: spacing.sm },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E3E9F1",
    backgroundColor: "#FCFDFE",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.ink,
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  pill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill },
  pillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.15 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
