
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Pill, Field } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import {
  apiCreateDiscussion,
  apiDiscussionTopics,
  apiListDiscussions,
  DiscussionRecord,
  DiscussionTopic,
} from "@/src/lib/api";

export default function Counselling() {
  const app = useApp();

  const [topics, setTopics] = useState<DiscussionTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [discussions, setDiscussions] = useState<DiscussionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [availableTopics, ownDiscussions] = await Promise.all([
        apiDiscussionTopics(),
        apiListDiscussions(),
      ]);

      setTopics(availableTopics);
      setDiscussions(ownDiscussions);

      setSelectedTopic((current) =>
        availableTopics.some((topic) => topic.id === current)
          ? current
          : availableTopics[0]?.id || ""
      );
    } catch (error) {
      Alert.alert(
        "Counselling unavailable",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async () => {
    if (!selectedTopic || !title.trim() || !message.trim()) {
      return Alert.alert(
        "Complete the form",
        "Choose a topic and enter a title and opening message."
      );
    }

    try {
      setCreating(true);

      const discussion = await apiCreateDiscussion({
        topicId: selectedTopic,
        title: title.trim(),
        message: message.trim(),
      });

      setTitle("");
      setMessage("");

      await refresh();
      await app.refreshAccountData();

      router.push({
        pathname: "/discussion/[id]",
        params: { id: discussion.id },
      });
    } catch (error) {
      Alert.alert(
        "Could not start discussion",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen>
      <Heading
        title="You don’t have to do it alone"
        subtitle="Start a private discussion with a counsellor assigned to your chosen topic."
      />

      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: "#B8F2E8", fontWeight: "800" }}>
          PRIVATE COUNSELLING
        </Text>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 20 }}>
          A real conversation, handled securely.
        </Text>
        <Text style={{ color: "#E1EDF5" }}>
          Your discussion is visible to you, your assigned counsellor and
          authorised administrators. The system only assigns counsellors who
          cover your topic and have capacity.
        </Text>
      </Card>

      <Heading title="Start a discussion" small />

      <Card>
        <Text style={{ color: colors.ink, fontWeight: "800" }}>
          Choose a topic
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : topics.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {topics.map((topic) => (
              <Pressable
                key={topic.id}
                onPress={() => setSelectedTopic(topic.id)}
              >
                <View
                  style={{
                    paddingHorizontal: 13,
                    paddingVertical: 10,
                    borderRadius: 22,
                    backgroundColor:
                      selectedTopic === topic.id
                        ? colors.primary
                        : colors.softBlue,
                  }}
                >
                  <Text
                    style={{
                      color: selectedTopic === topic.id ? "#fff" : colors.ink,
                      fontWeight: "700",
                    }}
                  >
                    {topic.name}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.muted }}>
            No counselling topics are currently available.
          </Text>
        )}

        <Field
          label="Discussion title"
          value={title}
          onChangeText={setTitle}
          placeholder="What would you like support with?"
        />

        <Field
          label="Opening message"
          value={message}
          onChangeText={setMessage}
          placeholder="Share a little context to help your counsellor understand…"
          multiline
        />

        <Button
          title={creating ? "Starting…" : "Start private discussion"}
          onPress={() => void create()}
          disabled={creating || loading || !selectedTopic}
        />
      </Card>

      <Heading title="Your discussions" small />

      {discussions.length ? (
        discussions.map((item) => (
          <Pressable
            key={item.id}
            onPress={() =>
              router.push({
                pathname: "/discussion/[id]",
                params: { id: item.id },
              })
            }
          >
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    color: colors.ink,
                    fontWeight: "800",
                    flex: 1,
                  }}
                >
                  {item.title}
                </Text>

                <Pill
                  label={item.status.replaceAll("_", " ")}
                  tone={
                    item.status === "COMPLETED" ||
                    item.status === "CANCELLED"
                      ? "red"
                      : "green"
                  }
                />
              </View>

              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {item.topic.name} · {item._count?.messages ?? 0} messages
              </Text>

              <Text style={{ color: colors.primary, fontWeight: "800" }}>
                Open discussion →
              </Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card>
          <Text style={{ color: colors.muted }}>
            You have not started a counselling discussion yet.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
