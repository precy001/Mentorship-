import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button } from "@/src/components/UI";
import { ResourceCard, ScholarshipCard } from "@/src/components/ContentCards";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import { apiGetPublicResources, apiGetPublicScholarships, PublicResource, PublicScholarship } from "@/src/lib/api";

export default function Explore() {
  const app = useApp();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"resources" | "scholarships">(params.tab === "scholarships" ? "scholarships" : "resources");
  const [filter, setFilter] = useState("All");
  const [resources, setResources] = useState<PublicResource[]>([]);
  const [scholarships, setScholarships] = useState<PublicScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.allSettled([apiGetPublicResources(), apiGetPublicScholarships()]);
    if (r.status === "fulfilled") setResources(r.value);
    if (s.status === "fulfilled") setScholarships(s.value);
    const failure = r.status === "rejected" ? r.reason : s.status === "rejected" ? s.reason : null;
    setLoadError(failure ? (failure instanceof Error ? failure.message : "Content could not be loaded.") : "");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setFilter("All"); }, [tab]);

  const filters = useMemo(
    () => ["All", ...Array.from(new Set((tab === "resources" ? resources.map((i) => i.category) : scholarships.map((i) => i.level))))],
    [tab, resources, scholarships],
  );
  const matches = (text: string) => text.toLowerCase().includes(query.trim().toLowerCase());
  const visibleResources = resources.filter((i) => (filter === "All" || i.category === filter) && matches(`${i.title} ${i.category} ${i.description}`));
  const visibleScholarships = scholarships.filter((i) => (filter === "All" || i.level === filter) && matches(`${i.title} ${i.provider} ${i.level} ${i.description}`));
  const count = tab === "resources" ? visibleResources.length : visibleScholarships.length;

  return (
    <Screen>
      <Heading title="Explore your possibilities" subtitle="Learning resources and funding opportunities published by Mentorship+ administrators." />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14 }}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search resources, scholarships…"
          placeholderTextColor="#9AA5B5"
          accessibilityLabel="Search resources and scholarships"
          returnKeyType="search"
          autoCorrect={false}
          style={{ flex: 1, paddingVertical: 14, color: colors.ink }}
        />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery("")}><Ionicons name="close-circle" size={18} color={colors.mutedLight} /></Pressable> : null}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["resources", "scholarships"] as const).map((t) => (
          <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: tab === t ? colors.primary : "#fff", borderWidth: 1, borderColor: tab === t ? colors.primary : colors.line, alignItems: "center" }}>
            <Text style={{ color: tab === t ? "#fff" : colors.ink, fontWeight: "700", fontSize: 12, textTransform: "capitalize" }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {filters.length > 2 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {filters.map((name) => (
            <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected: filter === name }} onPress={() => setFilter(name)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: filter === name ? colors.accentTint : colors.surface, borderWidth: 1, borderColor: filter === name ? colors.primary : colors.line }}>
              <Text style={{ color: filter === name ? colors.primaryDark : colors.muted, fontWeight: "700", fontSize: 12 }}>{name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      {loadError ? (
        <Card>
          <Text style={{ color: colors.error, fontWeight: "700" }}>Content could not be loaded</Text>
          <Text style={{ color: colors.muted }}>{loadError}</Text>
          <Button title="Try again" variant="secondary" loading={loading} onPress={() => void load()} />
        </Card>
      ) : null}

      {tab === "resources"
        ? visibleResources.map((item) => <ResourceCard key={item.id} item={item} saved={app.savedResources.includes(item.id)} onToggleSave={() => app.toggleResource(item.id)} />)
        : visibleScholarships.map((item) => <ScholarshipCard key={item.id} item={item} saved={app.savedScholarships.includes(item.id)} onToggleSave={() => app.toggleScholarship(item.id)} />)}

      {!loading && count === 0 && !loadError ? (
        <Card>
          <Text style={{ color: colors.ink, fontWeight: "800" }}>Nothing found</Text>
          <Text style={{ color: colors.muted }}>
            {query || filter !== "All" ? "No items match your search or filter. Try something broader." : `No published ${tab} are available yet. Check back soon.`}
          </Text>
        </Card>
      ) : null}

      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/feature/[slug]", params: { slug: "saved" } })}>
        <Text style={{ color: colors.primary, fontWeight: "800", textAlign: "center", padding: 10 }}>View saved resources and scholarships →</Text>
      </Pressable>
    </Screen>
  );
}
