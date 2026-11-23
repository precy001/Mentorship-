import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, BackLink, Button, EmptyState, ErrorState, LoadingBlock } from "@/src/components/UI";
import { NewsCard } from "@/src/components/NewsCard";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import { leaveScreen } from "@/src/lib/routes";
import { isNewPost } from "@/src/lib/newsFeed";
import { loadMoreNews, markNewsSeen, refreshNews, useNews } from "@/src/lib/news";

/**
 * News & updates from the Mentorship+ team: the same feed for members, counsellors and administrators.
 * Pinned posts first, then newest. Opening this screen marks everything loaded as seen; the "New" labels stay
 * visible for this visit, so you can still tell what is new while reading.
 */
export default function NewsScreen() {
  const app = useApp();
  const userId = app.user?.id;
  const news = useNews(userId);
  const [refreshing, setRefreshing] = useState(false);
  // What counted as seen when this screen opened: "New" labels use it for the whole visit.
  const seenAtOpen = useRef<string | null | undefined>(undefined);
  if (seenAtOpen.current === undefined && news.status === "ready") seenAtOpen.current = news.lastSeenAt;

  useEffect(() => { if (news.status === "ready" && news.items.length) markNewsSeen(); }, [news.status, news.items]);

  const onRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    try { await refreshNews(userId, { force: true }); } finally { setRefreshing(false); }
  };

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <BackLink onPress={() => leaveScreen(app.user?.role)} />
      <Heading title="News & updates" subtitle="Announcements and updates from the Mentorship+ team." />

      {news.status === "loading" || news.status === "idle" ? <LoadingBlock label="Loading updates…" /> : null}
      {news.status === "error" ? <ErrorState title="Couldn’t load updates" message={news.error ?? undefined} onRetry={() => void onRefresh()} /> : null}
      {news.status === "ready" && !news.items.length ? (
        <EmptyState icon="megaphone-outline" title="No updates yet" message="News and announcements from the Mentorship+ team will appear here." />
      ) : null}

      {news.items.map((item) => (
        <NewsCard key={item.id} item={item} isNew={isNewPost(item, seenAtOpen.current ?? null)} onPress={() => router.push({ pathname: "/news/[id]", params: { id: item.id } })} />
      ))}

      {news.nextCursor ? (
        <Button title={news.loadingMore ? "Loading…" : "Show older updates"} variant="secondary" loading={news.loadingMore} onPress={() => void loadMoreNews()} />
      ) : news.items.length > 3 ? (
        <View style={{ alignItems: "center", paddingVertical: 8 }}><Text style={{ color: colors.muted, fontSize: 12 }}>You’re all caught up.</Text></View>
      ) : null}
    </Screen>
  );
}
