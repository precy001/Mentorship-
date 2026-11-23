import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardTypeOptions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, layout, radii, shadows, spacing } from "@/src/lib/theme";
import { initialOf, type Tone } from "@/src/lib/format";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

/* ------------------------------------------------------------------ Screen */

export function Screen({
  children,
  scroll = true,
  style,
  scrollRef,
  safeTop = true,
  tabBar = false,
  onRefresh,
  refreshing = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  /** Lets a screen scroll to a section (for example, to an edit form). */
  scrollRef?: React.Ref<ScrollView>;
  /** Pads the top by the status-bar / notch height. Turn off when a parent already did. */
  safeTop?: boolean;
  /** A screen inside the bottom tabs (the docked tab bar already handles the bottom safe area). */
  tabBar?: boolean;
  /** Adds pull-to-refresh. */
  onRefresh?: () => void | Promise<unknown>;
  refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: (safeTop ? insets.top : 0) + spacing.lg,
    // Tab screens end at the top of the docked tab bar, which already accounts for the bottom inset.
    paddingBottom: tabBar ? 32 : 40 + insets.bottom,
  };
  return scroll ? (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.screen, padding, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screen, padding, { flex: 1 }, style]}>{children}</View>
  );
}

/* ------------------------------------------------------------------ text blocks */

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
    <View style={[styles.headingWrap, small && { gap: 4, marginBottom: 0 }]}>
      <Text accessibilityRole="header" style={[styles.heading, small && styles.headingSmall]}>
        {title}
      </Text>
      {subtitle ? <Text style={[styles.subtitle, small && { fontSize: 13, lineHeight: 19 }]}>{subtitle}</Text> : null}
    </View>
  );
}

/** Section title with an optional action on the right (for example "See all"). */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  right,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Heading title={title} subtitle={subtitle} small />
      </View>
      {right}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}, ${title}`}
          onPress={onAction}
          hitSlop={8}
          style={{ minHeight: layout.minTouchTarget - 8, justifyContent: "center" }}
        >
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Consistent, 44pt back control for pushed screens. Defaults to router.back(). */
export function BackLink({ label = "Back", onPress }: { label?: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress ?? (() => router.back())}
      hitSlop={8}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        minHeight: layout.minTouchTarget,
        paddingRight: 12,
        marginLeft: -4,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ surfaces */

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A whole card that can be tapped. Announces itself as one button to screen readers. */
export function PressableCard({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
    >
      {children}
    </Pressable>
  );
}

/** Dark brand banner used for the single most important message on a screen. */
export function HeroCard({
  title,
  body,
  icon,
  tone = "navy",
  eyebrow,
  children,
}: {
  title: string;
  body?: string;
  icon?: IconName;
  tone?: "navy" | "primary";
  /** Short sentence-case label shown above the title. */
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  const bg = tone === "navy" ? colors.navy : colors.primary;
  return (
    <View style={[styles.hero, { backgroundColor: bg, borderColor: bg }]}>
      {icon ? (
        <View style={styles.heroIcon}>
          <Ionicons name={icon} size={22} color={colors.white} />
        </View>
      ) : null}
      {eyebrow ? <Text style={{ color: colors.mint, fontWeight: "700", fontSize: 13 }}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={styles.heroTitle}>
        {title}
      </Text>
      {body ? <Text style={styles.heroBody}>{body}</Text> : null}
      {children}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: colors.softBlue, fg: colors.navy },
  green: { bg: colors.successBg, fg: colors.success },
  amber: { bg: colors.warningBg, fg: colors.warning },
  red: { bg: colors.errorBg, fg: colors.error },
  purple: { bg: "#F0EDFF", fg: "#5B4BB0" },
  neutral: { bg: colors.surfaceSecondary, fg: colors.muted },
};

export function Pill({ label, tone = "blue" }: { label: string; tone?: Tone }) {
  const { bg, fg } = toneColors[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Rounded square holding an icon. */
/** Number of messages not read yet, shown on a conversation in a list. Nothing when there are none. */
export function UnreadBadge({ count }: { count?: number | null }) {
  if (!count) return null;
  return (
    <View accessibilityLabel={`${count} unread`} style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.white, fontSize: 11, fontWeight: "800" }}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

export function IconBadge({
  icon,
  tone = "brand",
  size = 44,
}: {
  icon: IconName;
  tone?: "brand" | "green" | "amber" | "red" | "neutral" | "dark";
  size?: number;
}) {
  const map = {
    brand: { bg: colors.accentTint, fg: colors.primary },
    green: { bg: colors.successBg, fg: colors.success },
    amber: { bg: colors.warningBg, fg: colors.warning },
    red: { bg: colors.errorBg, fg: colors.error },
    neutral: { bg: colors.surfaceSecondary, fg: colors.muted },
    dark: { bg: "rgba(255,255,255,0.14)", fg: colors.white },
  }[tone];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: map.bg, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={size * 0.48} color={map.fg} />
    </View>
  );
}

export function Avatar({ name, uri, size = 48 }: { name?: string | null; uri?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const radius = size * 0.32;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name ? `${name}'s profile picture` : "Profile picture"}
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.accentTint, overflow: "hidden", alignItems: "center", justifyContent: "center" }}
    >
      {uri && !failed ? (
        <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={{ color: colors.primary, fontSize: size * 0.4, fontWeight: "800" }}>{initialOf(name)}</Text>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ states */

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={{ alignItems: "center", gap: 10, paddingVertical: 32 }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <IconBadge icon={icon} tone="brand" size={52} />
      <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16, textAlign: "center" }}>{title}</Text>
      {message ? <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 300 }}>{message}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" /> : null}
    </View>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retrying = false,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <View accessibilityRole="alert" style={styles.errorBox}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <Ionicons name="alert-circle" size={22} color={colors.error} style={{ marginTop: 1 }} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: colors.error, fontWeight: "800", fontSize: 15 }}>{title}</Text>
          {message ? <Text style={{ color: colors.ink, fontSize: 13, lineHeight: 19 }}>{message}</Text> : null}
        </View>
      </View>
      {onRetry ? <Button title="Try again" variant="secondary" size="sm" loading={retrying} onPress={onRetry} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ buttons */

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  accessibilityLabel,
  size = "md",
  icon,
  grow = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "dangerSoft";
  disabled?: boolean;
  /** Shows a spinner and blocks further presses while a request is running. */
  loading?: boolean;
  accessibilityLabel?: string;
  /** "sm" is still a 44pt touch target; it only tightens padding and type. */
  size?: "md" | "sm";
  icon?: IconName;
  /** Lets the button share a row equally with its neighbours (use inside ButtonRow). */
  grow?: boolean;
  style?: ViewStyle;
}) {
  const inactive = disabled || loading;
  const solid = variant === "primary" || variant === "danger";
  const textColor =
    variant === "secondary" ? colors.primaryDark : variant === "ghost" ? colors.ink : variant === "dangerSoft" ? colors.error : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityState={{ disabled: inactive, busy: loading }}
      android_ripple={{ color: solid ? "rgba(255,255,255,0.16)" : "rgba(41,55,245,0.08)", borderless: false }}
      style={({ pressed }) => [
        styles.button,
        size === "sm" && styles.buttonSmall,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        variant === "dangerSoft" && styles.dangerSoft,
        grow && { flexGrow: 1, minWidth: 120 },
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      <View style={styles.buttonContent}>
        {loading ? <ActivityIndicator size="small" color={solid ? colors.white : colors.primary} /> : icon ? <Ionicons name={icon} size={size === "sm" ? 16 : 18} color={textColor} /> : null}
        <Text style={[styles.buttonText, size === "sm" && { fontSize: 13 }, { color: textColor }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

/** Lays out several buttons side by side, wrapping onto a new line on narrow screens. */
export function ButtonRow({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: 10 }, style]}>{children}</View>;
}

/* ------------------------------------------------------------------ selection controls */

/** Selectable pill used for filters, topics and categories. 44pt tall with a visible selected state. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  count,
  disabled,
  accessibilityRole = "button",
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  count?: number;
  disabled?: boolean;
  accessibilityRole?: "button" | "radio" | "checkbox" | "tab";
}) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={count ? `${label}, ${count}` : label}
      accessibilityState={{ selected, checked: accessibilityRole === "checkbox" || accessibilityRole === "radio" ? selected : undefined, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={selected ? colors.white : colors.muted} /> : null}
      {selected && !icon && accessibilityRole !== "tab" ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}
      <Text style={{ color: selected ? colors.white : colors.ink, fontWeight: "700", fontSize: 13 }}>{label}</Text>
      {count ? (
        <View style={[styles.chipCount, selected && { backgroundColor: "rgba(255,255,255,0.28)" }]}>
          <Text style={{ color: selected ? colors.white : colors.primaryDark, fontSize: 11, fontWeight: "800" }}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Large radio-style choice with a title and optional description. */
export function OptionCard({
  title,
  description,
  selected,
  onPress,
  disabled,
}: {
  title: string;
  description?: string | null;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={description ? `${title}. ${description}` : title}
      accessibilityState={{ selected, checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && { opacity: 0.88 }, disabled && { opacity: 0.5 }]}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 15 }}>{title}</Text>
        {description ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{description}</Text> : null}
      </View>
      <View style={[styles.radio, selected && { borderColor: colors.primary, backgroundColor: colors.primary }]}>
        {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </View>
    </Pressable>
  );
}

/** Two- or three-way switch (for example Resources / Scholarships). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive, disabled && { opacity: 0.55 }]}
          >
            <Text style={{ color: active ? colors.primaryDark : colors.muted, fontWeight: active ? "800" : "700", fontSize: 13 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Five-star input with 44pt targets and screen-reader support. */
export function StarRating({
  value,
  onChange,
  label = "Rating",
  size = 30,
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  size?: number;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", marginLeft: -6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityLabel={`${n} ${n === 1 ? "star" : "stars"}`}
          accessibilityState={{ selected: n === value, checked: n === value }}
          onPress={() => onChange(n)}
          style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name={n <= value ? "star" : "star-outline"} size={size} color={n <= value ? colors.primary : colors.mutedLight} />
        </Pressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ rows and stats */

/** Tappable settings / navigation row with an icon, label and chevron. */
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  tone = "brand",
  badge,
  last = false,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: "brand" | "red" | "green" | "amber" | "neutral";
  badge?: string;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      android_ripple={{ color: "rgba(41,55,245,0.06)" }}
      style={({ pressed }) => [styles.listRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }, pressed && { backgroundColor: colors.surfaceSecondary }]}
    >
      <IconBadge icon={icon} tone={tone} size={42} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: tone === "red" ? colors.error : colors.ink, fontWeight: "800", fontSize: 15 }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{subtitle}</Text> : null}
      </View>
      {badge ? <Pill label={badge} tone="blue" /> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
    </Pressable>
  );
}

/** Container that clips a stack of ListRows into one card. */
export function ListGroup({ children }: { children: React.ReactNode }) {
  return <View style={[styles.card, { padding: 0, gap: 0, overflow: "hidden" }]}>{children}</View>;
}

/** Label / value line used for read-only details. */
export function InfoRow({ icon, label, value }: { icon?: IconName; label: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 36 }}>
      {icon ? <Ionicons name={icon} size={18} color={colors.muted} /> : null}
      <Text style={{ color: colors.muted, fontSize: 13, width: 82 }}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "700", flex: 1 }}>{value}</Text>
    </View>
  );
}

export function StatTile({
  label,
  value,
  icon,
  tone = "brand",
  hint,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon?: IconName;
  tone?: "brand" | "green" | "amber" | "red" | "neutral";
  hint?: string;
  /** Draws the border in the accent colour to flag items that need attention. */
  highlight?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ""}`}
      style={[styles.stat, highlight && { borderColor: colors.warning, backgroundColor: "#FFFBEB" }]}
    >
      {icon ? <IconBadge icon={icon} tone={tone} size={36} /> : null}
      <View style={{ gap: 1 }}>
        <Text style={{ color: colors.ink, fontSize: 24, lineHeight: 29, fontWeight: "900", letterSpacing: -0.5 }}>{value}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 16 }}>{label}</Text>
        {hint ? <Text style={{ color: colors.muted, fontSize: 11 }}>{hint}</Text> : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ form field */

type FieldIcon = IconName;

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  error,
  required,
  optional,
  helper,
  maxLength,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  textContentType,
  editable = true,
  onBlur,
  returnKeyType,
  onSubmitEditing,
  icon,
  accessibilityHint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  /** Validation message shown directly under the field. */
  error?: string | null;
  required?: boolean;
  /** Marks the field "(optional)" so people know they may skip it. */
  optional?: boolean;
  helper?: string;
  maxLength?: number;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  editable?: boolean;
  onBlur?: () => void;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  /** Optional leading icon. */
  icon?: FieldIcon;
  accessibilityHint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const secret = !!secureTextEntry;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      <View
        style={[
          styles.inputBox,
          multiline && { alignItems: "flex-start" },
          focused && styles.inputFocused,
          !!error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.muted} style={multiline ? { marginTop: 16 } : undefined} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secret && hidden}
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={`${label}${required ? ", required" : optional ? ", optional" : ""}`}
          accessibilityHint={error ?? accessibilityHint ?? helper}
          style={[styles.inputText, multiline && styles.multilineText]}
        />
        {secret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={10}
            onPress={() => setHidden((current) => !current)}
            style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: -6 }}
          >
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : helper || (maxLength && multiline) ? (
        <Text style={styles.helperText}>
          {helper ?? ""}
          {maxLength && multiline ? `${helper ? "  ·  " : ""}${value.length}/${maxLength}` : ""}
        </Text>
      ) : null}
    </View>
  );
}

/** Search input with a leading icon and a clear button. */
export function SearchField({
  value,
  onChangeText,
  placeholder = "Search",
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.inputBox, { backgroundColor: colors.surface }, focused && styles.inputFocused]}>
      <Ionicons name="search-outline" size={18} color={focused ? colors.primary : colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.inputText, { minHeight: 48, paddingVertical: 12 }]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={12} onPress={() => onChangeText("")}>
          <Ionicons name="close-circle" size={20} color={colors.mutedLight} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Segmented progress bar for multi-step flows such as registration. */
export function StepProgress({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <View accessible accessibilityLabel={`Step ${step} of ${total}. ${label}`} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {Array.from({ length: total }, (_, index) => (
          <View key={index} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: index < step ? colors.primary : colors.line }} />
        ))}
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
        Step {step} of {total} · {label}
      </Text>
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
    gap: 18,
    backgroundColor: colors.bg,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
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
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.md,
    ...shadows.card,
  },
  hero: {
    borderRadius: 24,
    padding: 22,
    gap: 10,
    borderWidth: 1,
    ...shadows.raised,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { color: colors.white, fontSize: 22, lineHeight: 29, fontWeight: "800", letterSpacing: -0.4 },
  heroBody: { color: colors.onDark, fontSize: 14, lineHeight: 21 },
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSmall: { minHeight: layout.minTouchTarget, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  secondary: { backgroundColor: "#EEF0FF", borderWidth: 1, borderColor: colors.brandBorder },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: colors.error },
  dangerSoft: { backgroundColor: colors.errorBg, borderWidth: 1, borderColor: "#FBCACA" },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonText: { fontWeight: "800", fontSize: 15, letterSpacing: 0.1, textAlign: "center" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  chip: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.accentTint,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.brandSurface },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  segmented: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentActive: { backgroundColor: colors.surface, ...shadows.card },
  listRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 68 },
  stat: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 130,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  errorBox: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: "#F3B5B5",
  },
  fieldWrap: { gap: 7, marginBottom: spacing.xs },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
  inputBox: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE3EC",
    backgroundColor: "#FCFDFE",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputFocused: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.white },
  inputText: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 14, minHeight: 52 },
  multilineText: { minHeight: 104, textAlignVertical: "top" },
  inputError: { borderColor: colors.error, backgroundColor: "#FFF8F8" },
  inputDisabled: { opacity: 0.6 },
  required: { color: colors.error, fontWeight: "800" },
  optional: { color: colors.muted, fontWeight: "500" },
  errorText: { color: colors.error, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  helperText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 6, borderRadius: radii.pill },
  pillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.15 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});

// Re-exported so screens needing keyboard-safe composers can share the same constant.
export const KEYBOARD_BEHAVIOR = Platform.OS === "ios" ? ("padding" as const) : undefined;
