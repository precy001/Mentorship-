import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button, Field, Pill } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import { apiGetDiscussion, apiSendDiscussionMessage, apiSetDiscussionStatus, apiCreateRating, DiscussionMessage, DiscussionRecord, apiMyRatings, MyRating } from "@/src/lib/api";
export default function DiscussionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const [discussion, setDiscussion] = useState<(DiscussionRecord & { messages: DiscussionMessage[] }) | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [ratingSent, setRatingSent] = useState(false);
  const [existingRating, setExistingRating] = useState<MyRating | null>(null);
  const refresh = useCallback(async () => {
    try {
      const value = await apiGetDiscussion(String(id)); setDiscussion(value);
      if (app.user?.role === "member") {
        const ratings = await apiMyRatings();
        const existing = ratings.find(item => item.discussionId === String(id));
        if (existing) { setExistingRating(existing); setRatingSent(true); }
      }
    }
    catch (error) { Alert.alert("Discussion unavailable", error instanceof Error ? error.message : "You may not have access to this discussion."); }
    finally { setLoading(false); }
  }, [id, app.user?.role]);
  useEffect(() => { void refresh(); }, [refresh]);
  const send = async () => {
    if (!message.trim() || sending) return;
    try { setSending(true); await apiSendDiscussionMessage(String(id), message.trim()); setMessage(""); await refresh(); await app.refreshAccountData(); }
    catch (error) { Alert.alert("Message not sent", error instanceof Error ? error.message : "Please try again."); }
    finally { setSending(false); }
  };
  const close = async () => {
    try { await apiSetDiscussionStatus(String(id), app.user?.role === "member" ? "CANCELLED" : "COMPLETED"); await refresh(); await app.refreshAccountData(); }
    catch (error) { Alert.alert("Could not update discussion", error instanceof Error ? error.message : "Please try again."); }
  };
  if (loading) return <Screen><ActivityIndicator color={colors.primary} /></Screen>;
  if (!discussion) return <Screen><Heading title="Discussion unavailable" /><Button title="Go back" onPress={() => router.back()} /></Screen>;
  const closed = ["COMPLETED", "CANCELLED"].includes(discussion.status);
  return <Screen>
    <Text onPress={() => router.back()} style={{ color: colors.primary, fontWeight: "800" }}>← Back</Text>
    <Heading title={discussion.title} subtitle={discussion.topic.name} />
    <Card><Pill label={discussion.status.replaceAll("_", " ")} tone={closed ? "red" : "green"} /><Text style={{ color: colors.muted, fontSize: 12 }}>Created {new Date(discussion.createdAt).toLocaleString()}</Text></Card>
    {discussion.messages.map(item => <View key={item.id} style={{ alignSelf: item.author.id === app.user?.id ? "flex-end" : "stretch", maxWidth: "92%", backgroundColor: item.author.id === app.user?.id ? colors.primary : "#fff", padding: 13, borderRadius: 15, borderWidth: item.author.id === app.user?.id ? 0 : 1, borderColor: colors.line, gap: 5 }}><Text style={{ color: item.author.id === app.user?.id ? "#fff" : colors.ink, fontWeight: "800", fontSize: 12 }}>{item.author.displayName || (item.author.role === "COUNSELLOR" ? "Counsellor" : "Member")}</Text><Text style={{ color: item.author.id === app.user?.id ? "#fff" : colors.ink, lineHeight: 21 }}>{item.body}</Text><Text style={{ color: item.author.id === app.user?.id ? "#DDE7F5" : colors.muted, fontSize: 10 }}>{new Date(item.createdAt).toLocaleString()}</Text></View>)}
    {!closed ? <><Field label="Your message" value={message} onChangeText={setMessage} placeholder="Write a message…" multiline /><Button title={sending ? "Sending…" : "Send message"} onPress={() => void send()} disabled={sending || !message.trim()} /><Button title={app.user?.role === "member" ? "Cancel discussion" : "Complete discussion"} variant="secondary" onPress={() => Alert.alert("Close discussion?", "This will end the active discussion and release the counsellor assignment.", [{ text: "Keep open", style: "cancel" }, { text: "Confirm", style: "destructive", onPress: () => void close() }])} /></> : <Text style={{ color: colors.muted }}>This discussion is closed.</Text>}
    {discussion.status === "COMPLETED" && app.user?.role === "member" && existingRating ? <Pill label={`Rating submitted · ${existingRating.score}/5 · ${existingRating.moderationStatus.toLowerCase()}`} tone="green" /> : null}
    {discussion.status === "COMPLETED" && app.user?.role === "member" && !ratingSent ? <Card><Heading title="Rate your counsellor" small subtitle="Your rating will be reviewed before it contributes to the counsellor's public average." /><View style={{ flexDirection: "row", gap: 10 }}>{[1,2,3,4,5].map(value => <Text key={value} onPress={() => setRating(value)} style={{ fontSize: 28, color: value <= rating ? colors.primary : colors.mutedLight }}>★</Text>)}</View><Field label="Optional feedback" value={feedback} onChangeText={setFeedback} placeholder="Share your experience" multiline /><Button title="Submit rating" disabled={!rating} onPress={async () => { try { await apiCreateRating({ discussionId: discussion.id, score: rating, feedback: feedback.trim() || undefined }); setRatingSent(true); Alert.alert("Rating submitted", "Thank you. Your feedback is pending moderation."); } catch (error) { Alert.alert("Rating not submitted", error instanceof Error ? error.message : "Please try again."); } }} /></Card> : null}
    {ratingSent ? <Pill label="Rating submitted" tone="green" /> : null}
  </Screen>;
}
