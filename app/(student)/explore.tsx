import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Button, Chip, Segmented, SearchField, LoadingBlock, ErrorState, EmptyState } from "@/src/components/UI";
import { GrantCard, ResourceCard, ScholarshipCard } from "@/src/components/ContentCards";
import { colors } from "@/src/lib/theme";
import { pluralize } from "@/src/lib/format";
import { useApp } from "@/src/context/AppContext";
import { isForMember } from "@/src/lib/audience";
import { openContent } from "@/src/lib/routes";
import { ApiError, apiGetPublicGrants, apiGetPublicResources, apiGetPublicScholarships, PublicGrant, PublicResource, PublicScholarship } from "@/src/lib/api";

type Tab = "resources" | "scholarships" | "grants";
const TABS: Tab[] = ["resources", "scholarships", "grants"];
const asTab = (value: unknown): Tab | null => (TABS.includes(value as Tab) ? (value as Tab) : null);

export default function Explore() {
  const app = useApp();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>(asTab(params.tab) ?? "resources");
  const [filter, setFilter] = useState("All");
  const [resources, setResources] = useState<PublicResource[]>([]);
  const [scholarships, setScholarships] = useState<PublicScholarship[]>([]);
  const [grants, setGrants] = useState<PublicGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s, g] = await Promise.allSettled([apiGetPublicResources(), apiGetPublicScholarships(), apiGetPublicGrants()]);
    if (r.status === "fulfilled") setResources(r.value);
    if (s.status === "fulfilled") setScholarships(s.value);
    if (g.status === "fulfilled") setGrants(g.value);
    // An API that predates grants answers 404 for them: treat that as "no grants yet" rather than an error.
    const grantsMissing = g.status === "rejected" && g.reason instanceof ApiError && g.reason.status === 404;
    const failure = [r, s, ...(grantsMissing ? [] : [g])].find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
    setLoadError(failure ? (failure.reason instanceof Error ? failure.reason.message : "Content could not be loaded.") : "");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setFilter("All"); }, [tab]);
  // Follow the tab requested by a link such as "See all grants" while this screen is already mounted.
  useEffect(() => { const next = asTab(params.tab); if (next) setTab(next); }, [params.tab]);

  // Only what administrators published for this member's group ("Who is this for?").
  const mine = useMemo(() => ({
    resources: resources.filter((item) => isForMember(item, app.user)),
    scholarships: scholarships.filter((item) => isForMember(item, app.user)),
    grants: grants.filter((item) => isForMember(item, app.user)),
  }), [resources, scholarships, grants, app.user]);

  const filters = useMemo(() => {
    if (tab === "resources") return ["All", ...Array.from(new Set(mine.resources.map((i) => i.category)))];
    if (tab === "scholarships") return ["All", ...Array.from(new Set(mine.scholarships.map((i) => i.level)))];
    return [];
  }, [tab, mine]);
  const matches = (text: string) => text.toLowerCase().includes(query.trim().toLowerCase());
  const visibleResources = mine.resources.filter((i) => (filter === "All" || i.category === filter) && matches(`${i.title} ${i.category} ${i.description}`));
  const visibleScholarships = mine.scholarships.filter((i) => (filter === "All" || i.level === filter) && matches(`${i.title} ${i.provider} ${i.level} ${i.description}`));
  const visibleGrants = mine.grants.filter((i) => matches(`${i.title} ${i.provider} ${i.amount ?? ""} ${i.description} ${i.eligibility}`));
  const count = tab === "resources" ? visibleResources.length : tab === "scholarships" ? visibleScholarships.length : visibleGrants.length;
  const savedCount = app.savedResources.length + app.savedScholarships.length + app.savedGrants.length;
  const filtering = !!query.trim() || filter !== "All";
  const anyLoaded = resources.length + scholarships.length + grants.length > 0;
  const label = (name: string, n: number) => `${name}${n ? ` (${n})` : ""}`;
  const group = app.user?.subcategoryName || app.user?.categoryName;

  return (
    <Screen tabBar onRefresh={load} refreshing={loading && anyLoaded}>
      <Heading title="Explore your possibilities" subtitle={group ? `Resources and opportunities for ${group.toLowerCase()}, published by Mentorship+.` : "Resources and opportunities published by Mentorship+."} />

      <SearchField value={query} onChangeText={setQuery} placeholder="Search resources, scholarships, grants…" accessibilityLabel="Search resources, scholarships and grants" />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { label: label("Resources", mine.resources.length), value: "resources" },
          { label: label("Scholarships", mine.scholarships.length), value: "scholarships" },
          { label: label("Grants", mine.grants.length), value: "grants" },
        ]}
      />

      {filters.length > 2 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22 }} style={{ flexGrow: 0, marginHorizontal: -22 }}>
          {filters.map((name) => <Chip key={name} label={name} selected={filter === name} onPress={() => setFilter(name)} />)}
        </ScrollView>
      ) : null}

      {loading && !anyLoaded ? <LoadingBlock label="Loading opportunities…" /> : null}

      {loadError ? <ErrorState title="Some content could not be loaded" message={loadError} retrying={loading} onRetry={() => void load()} /> : null}

      {!loading && count > 0 && filtering ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 13 }}>{pluralize(count, "result")}</Text>
      ) : null}

      {tab === "resources" ? visibleResources.map((item) => <ResourceCard key={item.id} item={item} saved={app.savedResources.includes(item.id)} onToggleSave={() => app.toggleResource(item.id)} onPress={() => openContent("resource", item.id)} />) : null}
      {tab === "scholarships" ? visibleScholarships.map((item) => <ScholarshipCard key={item.id} item={item} saved={app.savedScholarships.includes(item.id)} onToggleSave={() => app.toggleScholarship(item.id)} onPress={() => openContent("scholarship", item.id)} />) : null}
      {tab === "grants" ? visibleGrants.map((item) => <GrantCard key={item.id} item={item} saved={app.savedGrants.includes(item.id)} onToggleSave={() => app.toggleGrant(item.id)} onPress={() => openContent("grant", item.id)} />) : null}

      {!loading && count === 0 ? (
        <EmptyState
          icon={filtering ? "search-outline" : tab === "resources" ? "book-outline" : tab === "scholarships" ? "school-outline" : "cash-outline"}
          title={filtering ? "Nothing matches yet" : `No ${tab} for you yet`}
          message={filtering
            ? "No items match your search or filter. Try something broader."
            : tab === "grants" ? "Grants are published for specific groups, such as business owners, artisans and job seekers. New ones will appear here when they match your profile."
            : tab === "scholarships" ? "Scholarships are published for students. New ones will appear here when they match your profile."
            : "Check back soon for new resources."}
          actionLabel={filtering ? "Clear search and filters" : "Check my membership category"}
          onAction={filtering ? () => { setQuery(""); setFilter("All"); } : () => router.push("/(student)/profile")}
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
