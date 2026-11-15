import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Button, Chip, Segmented, SearchField, LoadingBlock, ErrorState, EmptyState } from "@/src/components/UI";
import { ResourceCard, ScholarshipCard } from "@/src/components/ContentCards";
import { colors } from "@/src/lib/theme";
import { pluralize } from "@/src/lib/format";
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
  // Follow the tab requested by a deep link such as "See all scholarships" while this screen is already mounted.
  useEffect(() => { if (params.tab === "scholarships" || params.tab === "resources") setTab(params.tab); }, [params.tab]);

  const filters = useMemo(
    () => ["All", ...Array.from(new Set((tab === "resources" ? resources.map((i) => i.category) : scholarships.map((i) => i.level))))],
    [tab, resources, scholarships],
  );
  const matches = (text: string) => text.toLowerCase().includes(query.trim().toLowerCase());
  const visibleResources = resources.filter((i) => (filter === "All" || i.category === filter) && matches(`${i.title} ${i.category} ${i.description}`));
  const visibleScholarships = scholarships.filter((i) => (filter === "All" || i.level === filter) && matches(`${i.title} ${i.provider} ${i.level} ${i.description}`));
  const count = tab === "resources" ? visibleResources.length : visibleScholarships.length;
  const savedCount = app.savedResources.length + app.savedScholarships.length;
  const filtering = !!query.trim() || filter !== "All";

  return (
    <Screen tabBar onRefresh={load} refreshing={loading && (resources.length > 0 || scholarships.length > 0)}>
      <Heading title="Explore your possibilities" subtitle="Learning resources and funding opportunities published by Mentorship+ administrators." />

      <SearchField value={query} onChangeText={setQuery} placeholder="Search resources, scholarships…" accessibilityLabel="Search resources and scholarships" />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[{ label: `Resources${resources.length ? ` (${resources.length})` : ""}`, value: "resources" }, { label: `Scholarships${scholarships.length ? ` (${scholarships.length})` : ""}`, value: "scholarships" }]}
      />

      {filters.length > 2 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22 }} style={{ flexGrow: 0, marginHorizontal: -22 }}>
          {filters.map((name) => <Chip key={name} label={name} selected={filter === name} onPress={() => setFilter(name)} />)}
        </ScrollView>
      ) : null}

      {loading && !resources.length && !scholarships.length ? <LoadingBlock label="Loading opportunities…" /> : null}

      {loadError ? <ErrorState title="Content could not be loaded" message={loadError} retrying={loading} onRetry={() => void load()} /> : null}

      {!loading && !loadError && count > 0 && filtering ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 13 }}>{pluralize(count, "result")}</Text>
      ) : null}

      {tab === "resources"
        ? visibleResources.map((item) => <ResourceCard key={item.id} item={item} saved={app.savedResources.includes(item.id)} onToggleSave={() => app.toggleResource(item.id)} />)
        : visibleScholarships.map((item) => <ScholarshipCard key={item.id} item={item} saved={app.savedScholarships.includes(item.id)} onToggleSave={() => app.toggleScholarship(item.id)} />)}

      {!loading && count === 0 && !loadError ? (
        <EmptyState
          icon={filtering ? "search-outline" : tab === "resources" ? "book-outline" : "school-outline"}
          title={filtering ? "Nothing matches yet" : "Nothing here yet"}
          message={filtering ? "No items match your search or filter. Try something broader." : `No published ${tab} are available yet. Check back soon.`}
          actionLabel={filtering ? "Clear search and filters" : undefined}
          onAction={filtering ? () => { setQuery(""); setFilter("All"); } : undefined}
        />
      ) : null}

      <Button
        title={savedCount ? `Saved items (${savedCount})` : "Saved items"}
        icon="heart-outline"
        variant="secondary"
        onPress={() => router.push({ pathname: "/feature/[slug]", params: { slug: "saved" } })}
      />
    </Screen>
  );
}
