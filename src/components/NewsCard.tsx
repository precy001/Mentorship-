import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IconBadge, Pill } from "@/src/components/UI";
import { SmartImage } from "@/src/components/Forms";
import { colors, shadows } from "@/src/lib/theme";
import { formatShortDate } from "@/src/lib/format";
import { excerpt } from "@/src/lib/newsFeed";
import type { NewsPost } from "@/src/lib/api";

function Badges({ pinned, isNew }: { pinned: boolean; isNew: boolean }) {
  if (!pinned && !isNew) return null;
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {pinned ? <Pill label="Pinned" tone="purple" /> : null}
      {isNew ? <Pill label="New" tone="green" /> : null}
    </View>
  );
}

/**
 * A News & updates post. `compact` is the short row used on dashboards; the full card (with picture and preview)
 * is used on the News screen.
 */
export function NewsCard({ item, isNew = false, compact = false, onPress }: { item: NewsPost; isNew?: boolean; compact?: boolean; onPress: () => void }) {
  const date = formatShortDate(item.publishedAt);
  const label = `${item.pinned ? "Pinned. " : ""}${isNew ? "New. " : ""}${item.title}. ${date}.`;

  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens this update"
        onPress={onPress}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, paddingVertical: 10, opacity: pressed ? 0.75 : 1 })}
      >
        {item.imageUrl ? (
          <View style={{ width: 52, height: 52 }}><SmartImage uri={item.imageUrl} aspectRatio={1} radius={14} fallbackIcon="megaphone-outline" /></View>
        ) : <IconBadge icon={item.pinned ? "pin-outline" : "megaphone-outline"} size={52} />}
        <View style={{ flex: 1, gap: 4 }}>
          <Badges pinned={item.pinned} isNew={isNew} />
          <Text numberOfLines={2} style={{ color: colors.ink, fontWeight: "800", fontSize: 15, lineHeight: 20 }}>{item.title}</Text>
          <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>{date} · {excerpt(item.body, 60)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedLight} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens this update"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: isNew ? colors.primary : colors.cardBorder,
        overflow: "hidden", ...shadows.card, opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      {item.imageUrl ? <SmartImage uri={item.imageUrl} radius={0} accessibilityLabel="" /> : null}
      <View style={{ padding: 16, gap: 8 }}>
        <Badges pinned={item.pinned} isNew={isNew} />
        <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17, lineHeight: 23 }}>{item.title}</Text>
        <Text numberOfLines={3} style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>{excerpt(item.body, 220)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Mentorship+ team · {date}</Text>
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>Read</Text>
        </View>
      </View>
    </Pressable>
  );
}
