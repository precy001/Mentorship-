import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Pill } from "@/src/components/UI";
import { SmartImage } from "@/src/components/Forms";
import { colors } from "@/src/lib/theme";
import { daysUntil, formatDisplayDate } from "@/src/lib/validation";
import { resourceArt, scholarshipArt } from "@/src/lib/contentArt";

export type ResourceItem = { id: string; title: string; category: string; readTime: string; description: string; imageUrl?: string | null };
export type ScholarshipItem = { id: string; title: string; provider: string; level: string; deadline: string; eligibility: string; description: string; imageUrl?: string | null; applyUrl?: string | null };
export type GrantItem = { id: string; title: string; provider: string; amount: string | null; deadline: string | null; eligibility: string; description: string; imageUrl?: string | null; applyUrl?: string | null };

const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: "#E8EDF4",
  overflow: "hidden" as const,
  shadowColor: "#172554",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.055,
  shadowRadius: 16,
  elevation: 2,
};

function SaveButton({ saved, onPress, label }: { saved: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${saved ? "Remove from saved" : "Save"}: ${label}`}
      accessibilityState={{ selected: saved }}
      hitSlop={10}
      onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: saved ? colors.accentTint : colors.surfaceSecondary }}
    >
      <Ionicons name={saved ? "heart" : "heart-outline"} size={20} color={saved ? colors.primary : colors.muted} />
    </Pressable>
  );
}

export function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = daysUntil(deadline);
  if (days < 0) return <Pill label="Closed" tone="red" />;
  if (days === 0) return <Pill label="Closes today" tone="amber" />;
  if (days <= 14) return <Pill label={`${days} day${days === 1 ? "" : "s"} left`} tone="amber" />;
  return <Pill label={`Closes ${formatDisplayDate(deadline)}`} tone="green" />;
}

/** Long text collapses to a few lines and expands in place, so the full guidance is always readable. */
function ExpandableText({ text, lines = 3, style, label }: { text: string; lines?: number; style?: object; label: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 160 || text.split("\n").length > lines;
  return (
    <View style={{ gap: 6 }}>
      <Text numberOfLines={open ? undefined : lines} style={style}>{text}</Text>
      {long ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${open ? "Show less" : "Read more"}: ${label}`} accessibilityState={{ expanded: open }} hitSlop={8} onPress={() => setOpen(value => !value)} style={{ minHeight: 32, justifyContent: "center", alignSelf: "flex-start" }}>
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>{open ? "Show less" : "Read more"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ResourceCard({ item, saved, onToggleSave, onPress }: { item: ResourceItem; saved?: boolean; onToggleSave?: () => void; onPress?: () => void }) {
  const content = (
    <View style={cardStyle}>
      <SmartImage uri={item.imageUrl} fallbackSource={resourceArt(item.category)} aspectRatio={16 / 9} radius={0} fallbackIcon="book-outline" accessibilityLabel={`Cover image for ${item.title}`} />
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Pill label={item.category} />
          {onToggleSave ? <SaveButton saved={!!saved} onPress={onToggleSave} label={item.title} /> : null}
        </View>
        <Text style={{ color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: "800", letterSpacing: -0.2 }}>{item.title}</Text>
        <ExpandableText text={item.description} label={item.title} style={{ color: colors.muted, lineHeight: 21 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="time-outline" size={15} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>{item.readTime}</Text>
        </View>
      </View>
    </View>
  );
  // Cards that are not tappable as a whole (Explore, Saved) keep their own Read more / Save controls.
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.category}`} accessibilityHint="Opens the full resource" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>{content}</Pressable> : content;
}

export function ScholarshipCard({ item, saved, onToggleSave, onPress }: { item: ScholarshipItem; saved?: boolean; onToggleSave?: () => void; onPress?: () => void }) {
  const content = (
    <View style={cardStyle}>
      <SmartImage uri={item.imageUrl} fallbackSource={scholarshipArt()} aspectRatio={16 / 9} radius={0} fallbackIcon="school-outline" accessibilityLabel={`Image for ${item.title}`} />
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 }}>
            <Pill label={item.level} />
            <DeadlineBadge deadline={item.deadline} />
          </View>
          {onToggleSave ? <SaveButton saved={!!saved} onPress={onToggleSave} label={item.title} /> : null}
        </View>
        <Text style={{ color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: "800", letterSpacing: -0.2 }}>{item.title}</Text>
        <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "700" }}>{item.provider}</Text>
        <ExpandableText text={item.description} label={item.title} style={{ color: colors.muted, lineHeight: 21 }} />
        <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 14, padding: 12, gap: 4 }}>
          <Text style={{ color: colors.ink, fontSize: 12, fontWeight: "800" }}>Eligibility</Text>
          <ExpandableText text={item.eligibility} label={`${item.title} eligibility`} lines={3} style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="calendar-outline" size={15} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>Deadline {formatDisplayDate(item.deadline)}</Text>
        </View>
      </View>
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.provider}`} accessibilityHint="Opens the full details" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>{content}</Pressable> : content;
}

/** Grants: amount and closing date up front, because those decide whether a member reads on. */
export function GrantCard({ item, saved, onToggleSave, onPress }: { item: GrantItem; saved?: boolean; onToggleSave?: () => void; onPress?: () => void }) {
  const content = (
    <View style={cardStyle}>
      <SmartImage uri={item.imageUrl} fallbackSource={resourceArt("Business")} aspectRatio={16 / 9} radius={0} fallbackIcon="cash-outline" accessibilityLabel={`Image for ${item.title}`} />
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 }}>
            {item.amount ? <Pill label={item.amount} tone="green" /> : null}
            {item.deadline ? <DeadlineBadge deadline={item.deadline} /> : <Pill label="Open all year" tone="blue" />}
          </View>
          {onToggleSave ? <SaveButton saved={!!saved} onPress={onToggleSave} label={item.title} /> : null}
        </View>
        <Text style={{ color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: "800", letterSpacing: -0.2 }}>{item.title}</Text>
        <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "700" }}>{item.provider}</Text>
        <ExpandableText text={item.description} label={item.title} style={{ color: colors.muted, lineHeight: 21 }} />
        <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 14, padding: 12, gap: 4 }}>
          <Text style={{ color: colors.ink, fontSize: 12, fontWeight: "800" }}>Who can apply</Text>
          <ExpandableText text={item.eligibility} label={`${item.title} eligibility`} lines={3} style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }} />
        </View>
      </View>
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.provider}${item.amount ? `, ${item.amount}` : ""}`} accessibilityHint="Opens the full details" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>{content}</Pressable> : content;
}

/** Large banner for the most relevant published item. The dark strip keeps text legible on any photo. */
export function FeaturedBanner({ eyebrow, title, subtitle, imageUrl, onPress }: { eyebrow: string; title: string; subtitle?: string; imageUrl?: string | null; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${eyebrow}: ${title}`} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      <View style={{ ...cardStyle, borderRadius: 24 }}>
        <SmartImage uri={imageUrl} fallbackSource={resourceArt(eyebrow)} aspectRatio={16 / 9} radius={0} fallbackIcon="sparkles-outline" />
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, gap: 4, backgroundColor: "rgba(15,23,42,0.72)" }}>
          <Text style={{ color: "#C7D2FE", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }}>{eyebrow.toUpperCase()}</Text>
          <Text numberOfLines={2} style={{ color: colors.white, fontSize: 19, lineHeight: 25, fontWeight: "800" }}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={{ color: "#E2E8F0", fontSize: 12 }}>{subtitle}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}
