import React, { useEffect, useState } from "react";
import { Linking, Share, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen, Button, BackLink, EmptyState, LoadingBlock, Pill } from "@/src/components/UI";
import { SmartImage } from "@/src/components/Forms";
import { AppAlert } from "@/src/lib/alert";
import { colors } from "@/src/lib/theme";
import { formatDateTime } from "@/src/lib/format";
import { leaveScreen } from "@/src/lib/routes";
import { useApp } from "@/src/context/AppContext";
import { useNews } from "@/src/lib/news";
import { apiNewsPost, type NewsPost } from "@/src/lib/api";

/** One News & updates post in full. Taken from the loaded feed when possible, otherwise fetched once. */
export default function NewsPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const news = useNews(app.user?.id);
  const fromFeed = news.items.find((item) => item.id === String(id)) ?? null;
  const [fetched, setFetched] = useState<NewsPost | null>(null);
  const [missing, setMissing] = useState(false);
  const post = fromFeed ?? fetched;

  useEffect(() => {
    if (fromFeed || fetched) return;
    let active = true;
    apiNewsPost(String(id)).then((value) => { if (active) setFetched(value); }).catch(() => { if (active) setMissing(true); });
    return () => { active = false; };
  }, [id, fromFeed, fetched]);

  const openLink = async (url: string) => {
    try {
      if (!/^https?:\/\//i.test(url)) throw new Error("unsupported");
      await Linking.openURL(url);
    } catch {
      AppAlert.alert("Link could not be opened", "Copy the address and open it in your browser instead.");
    }
  };
  const share = async () => {
    if (!post) return;
    const message = [post.title, "", post.body, post.linkUrl, "", "Shared from Mentorship+"].filter((line) => line !== null).join("\n");
    try { await Share.share({ title: post.title, message }); } catch { /* the person closed the share sheet */ }
  };

  const back = <BackLink onPress={() => leaveScreen(app.user?.role)} />;
  if (!post && missing) return <Screen>{back}<EmptyState icon="megaphone-outline" title="Update not available" message="This update may have been removed." actionLabel="Go back" onAction={() => leaveScreen(app.user?.role)} /></Screen>;
  if (!post) return <Screen>{back}<LoadingBlock label="Opening update…" /></Screen>;

  const edited = post.publishedAt && new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > 60 * 60 * 1000;
  return (
    <Screen>
      {back}
      {post.imageUrl ? <SmartImage uri={post.imageUrl} accessibilityLabel="" /> : null}
      <View style={{ gap: 10 }}>
        {post.pinned ? <View style={{ flexDirection: "row" }}><Pill label="Pinned" tone="purple" /></View> : null}
        <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.5 }}>{post.title}</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Mentorship+ team · {formatDateTime(post.publishedAt)}{edited ? " · edited" : ""}</Text>
      </View>
      <Text selectable style={{ color: colors.ink, fontSize: 16, lineHeight: 25 }}>{post.body}</Text>
      {post.linkUrl ? <Button title="Read more" icon="open-outline" onPress={() => void openLink(post.linkUrl as string)} /> : null}
      <Button title="Share" icon="share-social-outline" variant="secondary" onPress={() => void share()} />
    </Screen>
  );
}
