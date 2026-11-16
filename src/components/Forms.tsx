import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii } from "@/src/lib/theme";
import { pickImage, type PickedImage } from "@/src/lib/imagePicker";
import { formatDisplayDate, parseDateString, toDateString } from "@/src/lib/validation";
import type { ToastState } from "@/src/lib/feedback";

/* ------------------------------------------------------------------ shared field chrome */

function FieldLabel({ label, required, optional }: { label: string; required?: boolean; optional?: boolean }) {
  return (
    <Text style={styles.label}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
      {optional ? <Text style={styles.optional}> (optional)</Text> : null}
    </Text>
  );
}

function FieldMessage({ error, helper }: { error?: string | null; helper?: string }) {
  if (error) {
    return (
      <Text accessibilityLiveRegion="polite" style={styles.error}>
        {error}
      </Text>
    );
  }
  return helper ? <Text style={styles.helper}>{helper}</Text> : null;
}

/* ------------------------------------------------------------------ dropdown / select */

export type SelectOption = { label: string; value: string };

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  required,
  optional,
  error,
  helper,
  disabled,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  error?: string | null;
  helper?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrap}>
      <FieldLabel label={label} required={required} optional={optional} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected ? selected.label : "not selected"}`}
        accessibilityHint="Opens a list of choices"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.control, !!error && styles.controlError, disabled && { opacity: 0.55 }]}
      >
        <Text numberOfLines={1} style={[styles.controlText, !selected && { color: colors.placeholder }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <FieldMessage error={error} helper={helper} />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close list" style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {label}
            </Text>
            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={[styles.option, active && { backgroundColor: colors.accentTint }]}
                  >
                    <Text style={[styles.optionText, active && { color: colors.primaryDark, fontWeight: "800" }]}>
                      {option.label}
                    </Text>
                    {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.sheetActions}>
              {optional && value ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  style={styles.sheetButton}
                >
                  <Text style={styles.sheetButtonText}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.sheetButton}>
                <Text style={styles.sheetButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ------------------------------------------------------------------ date picker */

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Calendar date picker implemented in JavaScript so it behaves identically on Android and iOS
 * and needs no extra native module (which would force a new store build for OTA-updated apps).
 * Values are YYYY-MM-DD strings in the viewer's local calendar.
 */
export function DatePickerField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  required,
  optional,
  error,
  helper,
  placeholder = "Select a date",
  disabled,
  defaultView,
  descendingYears = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  /** YYYY-MM-DD the calendar opens on when no date is chosen yet (for example 18 years ago for a date of birth). */
  defaultView?: string;
  /** Lists the year picker newest first, which is quicker for dates of birth. */
  descendingYears?: boolean;
  required?: boolean;
  optional?: boolean;
  error?: string | null;
  helper?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(parseDateString(value) ?? parseDateString(defaultView ?? "") ?? parseDateString(minDate ?? "") ?? new Date()));
  const [pickingYear, setPickingYear] = useState(false);
  const today = toDateString(new Date());

  useEffect(() => {
    if (open) {
      setView(startOfMonth(parseDateString(value) ?? parseDateString(defaultView ?? "") ?? parseDateString(minDate ?? "") ?? new Date()));
      setPickingYear(false);
    }
    // Re-anchor the calendar only when it is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const firstYear = parseDateString(minDate ?? "")?.getFullYear() ?? new Date().getFullYear() - 100;
  const lastYear = parseDateString(maxDate ?? "")?.getFullYear() ?? new Date().getFullYear() + 10;
  const years = useMemo(() => {
    const list = Array.from({ length: Math.max(lastYear - firstYear + 1, 1) }, (_, i) => firstYear + i);
    return descendingYears ? list.reverse() : list;
  }, [firstYear, lastYear, descendingYears]);

  const cells = useMemo(() => {
    const offset = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    return [...Array<null>(offset).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  }, [view]);

  const dateOf = (day: number) => toDateString(new Date(view.getFullYear(), view.getMonth(), day));
  const outOfRange = (date: string) => (!!minDate && date < minDate) || (!!maxDate && date > maxDate);
  const shiftMonth = (delta: number) => setView(new Date(view.getFullYear(), view.getMonth() + delta, 1));
  const canGoBack = !minDate || toDateString(new Date(view.getFullYear(), view.getMonth(), 0)) >= minDate;
  const canGoForward = !maxDate || toDateString(new Date(view.getFullYear(), view.getMonth() + 1, 1)) <= maxDate;

  return (
    <View style={styles.wrap}>
      <FieldLabel label={label} required={required} optional={optional} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value ? formatDisplayDate(value) : "no date chosen"}`}
        accessibilityHint="Opens a calendar"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.control, !!error && styles.controlError, disabled && { opacity: 0.55 }]}
      >
        <Text style={[styles.controlText, !value && { color: colors.placeholder }]}>{value ? formatDisplayDate(value) : placeholder}</Text>
        <Ionicons name="calendar-outline" size={19} color={colors.muted} />
      </Pressable>
      <FieldMessage error={error} helper={helper} />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close calendar" style={[styles.backdrop, { justifyContent: "center", padding: 22 }]} onPress={() => setOpen(false)}>
          <Pressable style={styles.calendar} onPress={() => undefined}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {label}
            </Text>
            <View style={styles.monthRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={!canGoBack || pickingYear} onPress={() => shiftMonth(-1)} style={[styles.navButton, (!canGoBack || pickingYear) && { opacity: 0.25 }]}>
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Choose year" onPress={() => setPickingYear((current) => !current)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.monthLabel}>
                  {MONTH_NAMES[view.getMonth()]} {view.getFullYear()}
                </Text>
                <Ionicons name={pickingYear ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={!canGoForward || pickingYear} onPress={() => shiftMonth(1)} style={[styles.navButton, (!canGoForward || pickingYear) && { opacity: 0.25 }]}>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </Pressable>
            </View>

            {pickingYear ? (
              <ScrollView style={{ maxHeight: 268 }} contentContainerStyle={styles.yearGrid}>
                {years.map((year) => {
                  const active = year === view.getFullYear();
                  return (
                    <Pressable key={year} accessibilityRole="button" onPress={() => { setView(new Date(year, view.getMonth(), 1)); setPickingYear(false); }} style={[styles.yearCell, active && { backgroundColor: colors.primary }]}>
                      <Text style={{ color: active ? colors.white : colors.ink, fontWeight: active ? "800" : "600" }}>{year}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <>
                <View style={{ flexDirection: "row", marginBottom: 4 }}>
                  {WEEKDAYS.map((day, index) => (
                    <Text key={`${day}${index}`} style={styles.weekday}>
                      {day}
                    </Text>
                  ))}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {cells.map((day, index) => {
                    if (day === null) return <View key={`blank-${index}`} style={styles.dayCell} />;
                    const date = dateOf(day);
                    const disabledDay = outOfRange(date);
                    const selected = date === value;
                    return (
                      <Pressable
                        key={date}
                        accessibilityRole="button"
                        accessibilityLabel={formatDisplayDate(date)}
                        accessibilityState={{ selected, disabled: disabledDay }}
                        disabled={disabledDay}
                        onPress={() => { onChange(date); setOpen(false); }}
                        style={styles.dayCell}
                      >
                        <View style={[styles.dayBubble, selected && { backgroundColor: colors.primary }, !selected && date === today && { borderWidth: 1, borderColor: colors.primary }]}>
                          <Text style={{ color: selected ? colors.white : disabledDay ? "#C3CCD8" : colors.ink, fontWeight: selected ? "800" : "600" }}>{day}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.sheetActions}>
              {!required && value ? (
                <Pressable accessibilityRole="button" onPress={() => { onChange(""); setOpen(false); }} style={styles.sheetButton}>
                  <Text style={styles.sheetButtonText}>Clear</Text>
                </Pressable>
              ) : null}
              {!outOfRange(today) ? (
                <Pressable accessibilityRole="button" onPress={() => { onChange(today); setOpen(false); }} style={styles.sheetButton}>
                  <Text style={styles.sheetButtonText}>Today</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.sheetButton}>
                <Text style={styles.sheetButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/* ------------------------------------------------------------------ image rendering */

/**
 * Remote image with a loading state, a fallback when the URL is missing or fails to load,
 * and a fixed aspect ratio so lists do not jump while images arrive.
 */
export function SmartImage({
  uri,
  aspectRatio = 16 / 9,
  fallbackIcon = "image-outline",
  fallbackSource,
  radius = radii.md,
  style,
  accessibilityLabel,
}: {
  uri?: string | null;
  aspectRatio?: number;
  /** Bundled artwork shown when there is no uploaded image or it fails to load. */
  fallbackSource?: ImageSourcePropType;
  fallbackIcon?: React.ComponentProps<typeof Ionicons>["name"];
  radius?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const [loading, setLoading] = useState(!!uri);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoading(!!uri);
    setFailed(false);
  }, [uri]);

  const showImage = !!uri && !failed;
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={showImage ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[{ width: "100%", aspectRatio, borderRadius: radius, overflow: "hidden", backgroundColor: colors.accentTint, alignItems: "center", justifyContent: "center" }, style]}
    >
      {showImage ? (
        <Image
          source={{ uri: uri ?? undefined, cache: "force-cache" }}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setFailed(true); setLoading(false); }}
        />
      ) : fallbackSource ? (
        <Image source={fallbackSource} resizeMode="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <Ionicons name={fallbackIcon} size={28} color={colors.primary} style={{ opacity: 0.55 }} />
      )}
      {showImage && loading ? <ActivityIndicator color={colors.primary} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ image upload field */

/**
 * Optional image input with preview, replace and remove. It validates type and size locally,
 * but never uploads: the parent uploads the picked file when the form is submitted so that an
 * abandoned form leaves nothing behind in storage.
 */
export function ImageUploadField({
  label = "Cover image",
  picked,
  existingUrl,
  existingRemoved,
  onPick,
  onRemove,
  disabled,
  error,
  helper = "JPG, PNG or WebP, up to 5 MB.",
  aspect = [16, 9],
}: {
  label?: string;
  picked: PickedImage | null;
  existingUrl?: string | null;
  existingRemoved?: boolean;
  onPick: (image: PickedImage) => void;
  /** Removes the picked image or, when none is picked, the existing one. */
  onRemove: () => void;
  disabled?: boolean;
  error?: string | null;
  helper?: string;
  aspect?: [number, number];
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const previewUri = picked?.uri ?? (existingRemoved ? null : existingUrl ?? null);

  const choose = async () => {
    if (picking || disabled) return;
    setPicking(true);
    setLocalError(null);
    try {
      const result = await pickImage(aspect);
      if (result.status === "picked") onPick(result.image);
      else if (result.status === "error") setLocalError(result.message);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "The image could not be opened.");
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <FieldLabel label={label} optional />
      {previewUri ? (
        <View style={{ gap: 10 }}>
          <SmartImage uri={previewUri} aspectRatio={aspect[0] / aspect[1]} accessibilityLabel={`${label} preview`} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Replace image" disabled={disabled || picking} onPress={() => void choose()} style={[styles.imageButton, (disabled || picking) && { opacity: 0.5 }]}>
              <Ionicons name="swap-horizontal" size={16} color={colors.primaryDark} />
              <Text style={styles.imageButtonText}>{picking ? "Opening…" : "Replace"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove image" disabled={disabled} onPress={() => { setLocalError(null); onRemove(); }} style={[styles.imageButton, { borderColor: "#F3C5C5" }, disabled && { opacity: 0.5 }]}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.imageButtonText, { color: colors.error }]}>Remove</Text>
            </Pressable>
          </View>
          {picked ? <Text style={styles.helper}>New image selected. It uploads when you save.</Text> : null}
        </View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={`Add ${label.toLowerCase()}`} disabled={disabled || picking} onPress={() => void choose()} style={[styles.dropzone, (disabled || picking) && { opacity: 0.5 }]}>
          {picking ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="image-outline" size={26} color={colors.primary} />}
          <Text style={{ color: colors.primaryDark, fontWeight: "800" }}>{picking ? "Opening photo library…" : "Choose an image"}</Text>
        </Pressable>
      )}
      <FieldMessage error={error ?? localError} helper={helper} />
    </View>
  );
}

/* ------------------------------------------------------------------ toast */

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  const success = toast.tone === "success";
  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      onPress={onDismiss}
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        top: insets.top + 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 14,
        borderRadius: 16,
        backgroundColor: success ? colors.successBg : colors.errorBg,
        borderWidth: 1,
        borderColor: success ? "#A7E3BA" : "#F3B5B5",
        shadowColor: "#0F172A",
        shadowOpacity: 0.14,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
        zIndex: 50,
      }}
    >
      <Ionicons name={success ? "checkmark-circle" : "alert-circle"} size={20} color={success ? colors.success : colors.error} />
      <Text style={{ flex: 1, color: success ? colors.success : colors.error, fontWeight: "700", lineHeight: 19 }}>{toast.message}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ styles */

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
  required: { color: colors.error, fontWeight: "800" },
  optional: { color: colors.muted, fontWeight: "500" },
  error: { color: colors.error, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  control: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: "#E3E9F1", backgroundColor: "#FCFDFE", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  controlError: { borderColor: colors.error, backgroundColor: "#FFF8F8" },
  controlText: { flex: 1, fontSize: 15, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 28, gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  option: { minHeight: 50, paddingHorizontal: 14, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  optionText: { fontSize: 15, color: colors.ink, flexShrink: 1 },
  sheetActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  sheetButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.surfaceSecondary },
  sheetButtonText: { color: colors.ink, fontWeight: "700" },
  calendar: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, gap: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 4 },
  monthLabel: { fontSize: 16, fontWeight: "800", color: colors.ink },
  navButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  weekday: { width: "14.28%", textAlign: "center", color: colors.muted, fontSize: 12, fontWeight: "700" },
  dayCell: { width: "14.28%", height: 42, alignItems: "center", justifyContent: "center" },
  dayBubble: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  yearGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 },
  yearCell: { width: "22%", minHeight: 44, justifyContent: "center", paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: colors.surfaceSecondary },
  dropzone: { minHeight: 112, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#C9D1FF", backgroundColor: "#F6F7FF", alignItems: "center", justifyContent: "center", gap: 8, padding: 16 },
  imageButton: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: "#DCE1FF", backgroundColor: "#F6F7FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  imageButtonText: { color: colors.primaryDark, fontWeight: "800", fontSize: 13 },
});
