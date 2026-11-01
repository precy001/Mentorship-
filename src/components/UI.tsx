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
    paddingBottom: 112,
    gap: spacing.lg,
    backgroundColor: colors.bg,
  },
  headingWrap: { gap: 6, marginBottom: 2 },
  heading: {
    fontSize: 29,
    lineHeight: 36,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.8,
  },
  headingSmall: { fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted, letterSpacing: 0.05 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 12,
    elevation: 1,
  },
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.accentTint, borderWidth: 1, borderColor: "#99F6E4" },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: colors.error },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.1 },
  secondaryText: { color: colors.primaryDark },
  ghostText: { color: colors.ink },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  fieldWrap: { gap: 8, marginBottom: spacing.sm },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
  input: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  pill: { alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 6, borderRadius: radii.pill },
  pillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.15 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
