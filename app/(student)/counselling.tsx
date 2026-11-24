import React, { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { AppAlert } from "@/src/lib/alert";
import { router, useFocusEffect } from "expo-router";
import { Screen, Heading, Card, Button, Pill, Field, HeroCard, Chip, SectionHeader, PressableCard, EmptyState, LoadingBlock, ErrorState, BackLink, UnreadBadge } from "@/src/components/UI";
import { backToHome } from "@/src/lib/routes";
import { colors } from "@/src/lib/theme";
import { discussionTone, humanize, pluralize } from "@/src/lib/format";
import { useApp } from "@/src/context/AppContext";
import {
  apiCreateDiscussion,
  apiDiscussionTopics,
  apiListDiscussions,
  DiscussionRecord,
  DiscussionTopic,
} from "@/src/lib/api";

// Matches the server limits in api/src/discussions/discussions.dto.ts.
const TITLE_MIN = 4;
const TITLE_MAX = 180;
const MESSAGE_MAX = 5000;

export default function Counselling() {
  const app = useApp();

  const [topics, setTopics] = useState<DiscussionTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [discussions, setDiscussions] = useState<DiscussionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadedOnce = useRef(false);
  const refresh = useCallback(async (silent = false) => {
    try {
      const [availableTopics, ownDiscussions] = await Promise.all([
        apiDiscussionTopics(),
        apiListDiscussions(),
      ]);

      setTopics(availableTopics);
      setDiscussions(ownDiscussions);
      setLoadError("");

      setSelectedTopic((current) =>
        availableTopics.some((topic) => topic.id === current)
          ? current
          : availableTopics[0]?.id || ""
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : "Please try again.";
      setLoadError(text);
      if (!silent) AppAlert.alert("Counselling unavailable", text);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on first visit, then quietly refresh each time the tab is shown again, so new replies and status
  // changes appear without pulling to refresh.
  useFocusEffect(useCallback(() => {
    void refresh(loadedOnce.current);
    loadedOnce.current = true;
  }, [refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  const titleError = showErrors && title.trim().length < TITLE_MIN ? (title.trim() ? `Use at least ${TITLE_MIN} characters.` : "Add a short title for your discussion.") : null;
  const messageError = showErrors && !message.trim() ? "Share a little about what you’d like support with." : null;

  const create = async () => {
    setShowErrors(true);
    if (!selectedTopic || !title.trim() || !message.trim()) {
      return AppAlert.alert(
        "Complete the form",
        "Choose a topic and enter a title and opening message."
      );
    }
    if (title.trim().length < TITLE_MIN) return;

    try {
      setCreating(true);

      const discussion = await apiCreateDiscussion({
        topicId: selectedTopic,
        title: title.trim(),
        message: message.trim(),
      });

      setTitle("");
      setMessage("");
      setShowErrors(false);

      await refresh();
      await app.refreshAccountData();

      router.push({
        pathname: "/discussion/[id]",
        params: { id: discussion.id },
      });
    } catch (error) {
      AppAlert.alert(
        "Could not start discussion",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen tabBar onRefresh={onRefresh} refreshing={refreshing}>
      <BackLink onPress={backToHome} />
      <Heading
        title="You don’t have to do it alone"
        subtitle="Start a private discussion with a mentor assigned to your chosen topic."
      />

      <HeroCard
        tone="primary"
        icon="shield-checkmark-outline"
        title="A real conversation, handled securely."
        body="Your discussion is visible to you, your assigned mentor and authorised administrators. The system only assigns mentors who cover your topic and have capacity."
      />

      <Card>
        <Heading title="Start a discussion" small subtitle="It only takes a minute." />

        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13 }}>Choose a topic</Text>
          {loading ? (
            <LoadingBlock label="Loading topics…" />
          ) : topics.length ? (
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {topics.map((topic) => (
                <Chip key={topic.id} label={topic.name} accessibilityRole="radio" selected={selectedTopic === topic.id} onPress={() => setSelectedTopic(topic.id)} />
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              No counselling topics are currently available.
            </Text>
          )}
        </View>

        <Field
          label="Discussion title"
          value={title}
          onChangeText={setTitle}
          placeholder="What would you like support with?"
          maxLength={TITLE_MAX}
          returnKeyType="next"
          error={titleError}
          editable={!creating}
        />

        <Field
          label="Opening message"
          value={message}
          onChangeText={setMessage}
          placeholder="Share a little context to help your mentor understand…"
          multiline
          maxLength={MESSAGE_MAX}
          error={messageError}
          editable={!creating}
        />

        <Button
          title={creating ? "Starting…" : "Start private discussion"}
          loading={creating}
          onPress={() => void create()}
          disabled={loading || !selectedTopic}
        />
      </Card>

      <SectionHeader title="Your discussions" subtitle={discussions.length ? pluralize(discussions.length, "conversation") : undefined} />

      {loadError && !loading ? <ErrorState title="Couldn’t load your discussions" message={loadError} onRetry={() => void refresh()} /> : null}

      {discussions.length ? (
        discussions.map((item) => {
          const messages = item._count?.messages ?? 0;
          const unread = item.unreadCount ?? 0;
          return (
            <PressableCard
              key={item.id}
              accessibilityLabel={`${item.title}. ${item.topic.name}. ${humanize(item.status)}. ${pluralize(messages, "message")}${unread ? `, ${unread} unread` : ""}.`}
              accessibilityHint="Opens the conversation"
              onPress={() => router.push({ pathname: "/discussion/[id]", params: { id: item.id } })}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <Text style={{ color: colors.ink, fontWeight: unread ? "900" : "800", fontSize: 16, lineHeight: 22, flex: 1 }}>{item.title}</Text>
                <UnreadBadge count={unread} />
                <Pill label={humanize(item.status)} tone={discussionTone(item.status)} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {item.topic.name} · {pluralize(messages, "message")}
              </Text>
            </PressableCard>
          );
        })
      ) : !loading && !loadError ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="No discussions yet"
          message="When you start a conversation it will appear here, so you can pick it up any time."
        />
      ) : null}
    </Screen>
  );
}
