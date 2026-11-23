import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button, Field, Pill, BackLink, LoadingBlock, EmptyState, StarRating, KEYBOARD_BEHAVIOR } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { discussionIsClosed, discussionTone, formatDateTime, humanize, pluralize } from "@/src/lib/format";
import { useApp } from "@/src/context/AppContext";
import { apiGetDiscussion, apiSendDiscussionMessage, apiSetDiscussionStatus, apiCreateRating, DiscussionMessage, DiscussionRecord, apiMyRatings, MyRating } from "@/src/lib/api";

const MESSAGE_MAX = 5000;

export default function DiscussionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [discussion, setDiscussion] = useState<(DiscussionRecord & { messages: DiscussionMessage[] }) | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [ratingSent, setRatingSent] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
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

  // New replies appear on their own: a quiet check every 15 seconds while this conversation is on screen,
  // and again as soon as the app comes back to the foreground. Errors here are ignored (the next check retries).
  const POLL_MS = 15_000;
  const poll = useCallback(async () => {
    try {
      const latest = await apiGetDiscussion(String(id));
      setDiscussion(current => {
        if (!current) return latest;
        const lastOld = current.messages[current.messages.length - 1]?.id;
        const lastNew = latest.messages[latest.messages.length - 1]?.id;
        return lastOld === lastNew && current.status === latest.status && current.messages.length === latest.messages.length ? current : latest;
      });
    } catch { /* quiet */ }
  }, [id]);
  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => { if (AppState.currentState === "active") void poll(); }, POLL_MS);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void poll(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [poll]));
  const [pulling, setPulling] = useState(false);
  const onPull = async () => { setPulling(true); try { await poll(); } finally { setPulling(false); } };

  // Keep the newest message in view when the conversation loads or grows.
  const messageCount = discussion?.messages.length ?? 0;
  useEffect(() => {
    if (!messageCount) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(timer);
  }, [messageCount]);

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
  const submitRating = async () => {
    if (!discussion) return;
    try {
      setSubmittingRating(true);
      await apiCreateRating({ discussionId: discussion.id, score: rating, feedback: feedback.trim() || undefined });
      setRatingSent(true);
      Alert.alert("Rating submitted", "Thank you. Your feedback is pending moderation.");
    } catch (error) { Alert.alert("Rating not submitted", error instanceof Error ? error.message : "Please try again."); }
    finally { setSubmittingRating(false); }
  };

  if (loading) return <Screen><BackLink /><LoadingBlock label="Opening conversation…" /></Screen>;
  if (!discussion) return <Screen>
    <BackLink />
    <EmptyState icon="lock-closed-outline" title="Discussion unavailable" message="This discussion could not be opened. You may not have access to it." actionLabel="Go back" onAction={() => router.back()} />
  </Screen>;

  const closed = discussionIsClosed(discussion.status);
  const isMember = app.user?.role === "member";
  const canSend = !!message.trim() && !sending;

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={KEYBOARD_BEHAVIOR}>
    <Screen scrollRef={scrollRef} style={{ gap: 14 }} onRefresh={onPull} refreshing={pulling}>
      <BackLink />
      <Heading title={discussion.title} subtitle={`${discussion.topic.name} · ${pluralize(discussion.messages.length, "message")}`} />
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Pill label={humanize(discussion.status)} tone={discussionTone(discussion.status)} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>Started {formatDateTime(discussion.createdAt)}</Text>
        </View>
        {!closed ? <Button
          title={isMember ? "Cancel discussion" : "Complete discussion"}
          variant={isMember ? "dangerSoft" : "secondary"}
          size="sm"
          icon={isMember ? "close-circle-outline" : "checkmark-circle-outline"}
          onPress={() => Alert.alert("Close discussion?", "This will end the active discussion and release the counsellor assignment.", [{ text: "Keep open", style: "cancel" }, { text: "Confirm", style: "destructive", onPress: () => void close() }])}
        /> : null}
      </Card>

      {discussion.messages.map(item => {
        const mine = item.author.id === app.user?.id;
        const counsellor = item.author.role === "COUNSELLOR";
        const author = item.author.displayName || (counsellor ? "Counsellor" : "Member");
        return <View
          key={item.id}
          accessible
          accessibilityLabel={`${mine ? "You" : author} said: ${item.body}. ${formatDateTime(item.createdAt)}`}
          style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "88%", backgroundColor: mine ? colors.primary : colors.surface, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, borderBottomRightRadius: mine ? 5 : 18, borderBottomLeftRadius: mine ? 18 : 5, borderWidth: mine ? 0 : 1, borderColor: colors.line, gap: 4 }}
        >
          {!mine ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 12 }}>{author}</Text>
            {counsellor ? <Ionicons name="shield-checkmark" size={13} color={colors.primary} /> : null}
          </View> : null}
          <Text selectable style={{ color: mine ? colors.white : colors.ink, lineHeight: 22, fontSize: 15 }}>{item.body}</Text>
          <Text style={{ color: mine ? "#D7DCFF" : colors.muted, fontSize: 11, alignSelf: "flex-end" }}>{formatDateTime(item.createdAt)}</Text>
        </View>;
      })}

      {closed ? <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 14 }}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
        <Text style={{ color: colors.muted, flex: 1, fontSize: 13, lineHeight: 19 }}>This discussion is closed.</Text>
      </View> : null}

      {discussion.status === "COMPLETED" && isMember && existingRating ? <Pill label={`Rating submitted · ${existingRating.score}/5 · ${humanize(existingRating.moderationStatus)}`} tone="green" /> : null}
      {discussion.status === "COMPLETED" && isMember && !ratingSent ? <Card>
        <Heading title="Rate your counsellor" small subtitle="Your rating will be reviewed before it contributes to the counsellor's public average." />
        <StarRating value={rating} onChange={setRating} label="Rate your counsellor" />
        <Field label="Feedback" optional value={feedback} onChangeText={setFeedback} placeholder="Share your experience" multiline maxLength={1000} editable={!submittingRating} />
        <Button title="Submit rating" loading={submittingRating} disabled={!rating} onPress={() => void submitRating()} />
      </Card> : null}
      {ratingSent && !existingRating ? <Pill label="Rating submitted" tone="green" /> : null}
    </Screen>

    {!closed ? <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }}>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Write a message…"
        placeholderTextColor={colors.placeholder}
        multiline
        maxLength={MESSAGE_MAX}
        editable={!sending}
        accessibilityLabel="Your message"
        style={{ flex: 1, maxHeight: 128, minHeight: 48, backgroundColor: colors.surfaceSecondary, borderRadius: 22, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13, fontSize: 15, color: colors.ink, textAlignVertical: "top" }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={sending ? "Sending message" : "Send message"}
        accessibilityState={{ disabled: !canSend, busy: sending }}
        disabled={!canSend}
        onPress={() => void send()}
        style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: canSend ? colors.primary : "#C7CCEF", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}
      >
        <Ionicons name={sending ? "hourglass-outline" : "send"} size={20} color={colors.white} />
      </Pressable>
    </View> : null}
  </KeyboardAvoidingView>;
}
