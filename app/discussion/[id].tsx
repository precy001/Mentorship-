import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { AppAlert } from "@/src/lib/alert";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button, Field, Pill, BackLink, LoadingBlock, EmptyState, StarRating, KEYBOARD_BEHAVIOR } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { discussionIsClosed, discussionTone, formatDateTime, formatTime, humanize, pluralize } from "@/src/lib/format";
import { useApp } from "@/src/context/AppContext";
import { ApiError, apiGetDiscussion, apiMarkDiscussionRead, apiSendDiscussionMessage, apiSetDiscussionStatus, apiCreateRating, DiscussionMessage, DiscussionRecord, apiMyRatings, MyRating } from "@/src/lib/api";
import {
  conversationSignature, makeClientId, markedSeen, newIncoming, nextPollDelay, PendingMessage, Receipt, RECEIPT_LABEL,
  receiptFor, stillPending, unseenFromOtherSide, withMessage,
} from "@/src/lib/receipts";
import { playSound, preloadSounds, useConversationSounds } from "@/src/lib/sounds";

const MESSAGE_MAX = 5000;
type Conversation = DiscussionRecord & { messages: DiscussionMessage[] };

/** Tick colours on your own (blue) bubbles. "Seen" is a bright cyan so it stands apart from the pale "sent" ticks. */
const TICK = "#D7DCFF";
const TICK_SEEN = "#5BE7F5";

function Ticks({ receipt }: { receipt: Receipt }) {
  const icon = receipt === "sending" ? "time-outline" : receipt === "failed" ? "alert-circle" : receipt === "sent" ? "checkmark" : "checkmark-done";
  const color = receipt === "seen" ? TICK_SEEN : receipt === "failed" ? "#FFD3D3" : TICK;
  return <Ionicons name={icon} size={receipt === "sending" ? 13 : 16} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
}

export default function DiscussionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [discussion, setDiscussion] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  /** Messages typed here that the server has not confirmed yet (shown with a clock, or "Not sent"). */
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [ratingSent, setRatingSent] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [existingRating, setExistingRating] = useState<MyRating | null>(null);
  const [soundsOn, setSoundsOn] = useConversationSounds();

  const me = app.user?.id;
  // Latest values for callbacks that outlive a render (timers, the send queue).
  const discussionRef = useRef<Conversation | null>(null);
  useEffect(() => { discussionRef.current = discussion; }, [discussion]);
  const focused = useRef(false);
  /** Last time someone wrote (sent or received): checks are quicker for a while after it. */
  const lastActivity = useRef(0);
  const seenInFlight = useRef(false);
  const receiptsSupported = useRef(true);

  /**
   * "Seen" receipts. Only while this conversation is on screen with the app in the foreground, and only for the
   * two sides of the conversation (an administrator overseeing it never marks messages as seen).
   */
  const acknowledgeSeen = useCallback(async (value: Conversation | null) => {
    if (!value || !receiptsSupported.current || seenInFlight.current || !focused.current || AppState.currentState !== "active") return;
    const participant = value.creator?.id === me || app.user?.role === "counsellor";
    if (!participant) return;
    const unseen = unseenFromOtherSide(value.messages, me, value.creator?.id);
    if (!unseen.length) return;
    seenInFlight.current = true;
    try {
      const result = await apiMarkDiscussionRead(String(id));
      const at = result.at ?? new Date().toISOString();
      const ids = new Set(unseen.map(item => item.id));
      setDiscussion(current => (current ? { ...current, messages: markedSeen(current.messages, ids, at) } : current));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) receiptsSupported.current = false; // older server
    } finally {
      seenInFlight.current = false;
    }
  }, [id, me, app.user?.role]);

  const refresh = useCallback(async () => {
    try {
      const value = await apiGetDiscussion(String(id)); setDiscussion(value);
      setPending(current => stillPending(current, value.messages));
      void acknowledgeSeen(value);
      if (app.user?.role === "member") {
        const ratings = await apiMyRatings();
        const existing = ratings.find(item => item.discussionId === String(id));
        if (existing) { setExistingRating(existing); setRatingSent(true); }
      }
    }
    catch (error) { AppAlert.alert("Discussion unavailable", error instanceof Error ? error.message : "You may not have access to this discussion."); }
    finally { setLoading(false); }
  }, [id, app.user?.role, acknowledgeSeen]);
  useEffect(() => { void refresh(); preloadSounds(); }, [refresh]);

  /**
   * New replies and receipt changes appear on their own. The conversation is checked every 4 seconds for two
   * minutes after anyone writes, then every 15 seconds, only while it is on screen and the app is in the
   * foreground, and straight away when the app comes back. Errors are ignored (the next check retries).
   */
  const poll = useCallback(async () => {
    try {
      const latest = await apiGetDiscussion(String(id));
      const previous = discussionRef.current;
      const incoming = previous ? newIncoming(previous.messages, latest.messages, me) : [];
      if (incoming.length) {
        lastActivity.current = Date.now();
        playSound("received");
      }
      setDiscussion(current => (!current || conversationSignature(current.status, current.messages) !== conversationSignature(latest.status, latest.messages) ? latest : current));
      setPending(current => stillPending(current, latest.messages));
      void acknowledgeSeen(latest);
    } catch { /* quiet */ }
  }, [id, me, acknowledgeSeen]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => { if (!cancelled) timer = setTimeout(tick, nextPollDelay(lastActivity.current)); };
    const tick = async () => { if (AppState.currentState === "active") await poll(); schedule(); };
    schedule();
    // Coming back to this screen, or the app returning to the foreground, checks at once.
    void acknowledgeSeen(discussionRef.current);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void poll(); });
    return () => { focused.current = false; cancelled = true; if (timer) clearTimeout(timer); subscription.remove(); };
  }, [poll, acknowledgeSeen]));
  const [pulling, setPulling] = useState(false);
  const onPull = async () => { setPulling(true); try { await poll(); } finally { setPulling(false); } };

  // Keep the newest message in view when the conversation loads or grows (including messages still sending).
  const messageCount = (discussion?.messages.length ?? 0) + pending.length;
  useEffect(() => {
    if (!messageCount) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(timer);
  }, [messageCount]);

  /**
   * Sending, WhatsApp style: the message appears at once with a clock, the box clears, and you can keep typing.
   * Sends go out one at a time, in the order written. Each message has its own client id, so a retry after a
   * dropped connection can never create a duplicate (the server returns the copy it already saved).
   */
  const sendQueue = useRef<Promise<void>>(Promise.resolve());
  const deliver = (item: PendingMessage) => {
    sendQueue.current = sendQueue.current.then(async () => {
      setPending(current => current.map(entry => (entry.clientId === item.clientId ? { ...entry, state: "sending", error: undefined } : entry)));
      try {
        const saved = await apiSendDiscussionMessage(String(id), item.body, item.clientId);
        lastActivity.current = Date.now();
        setDiscussion(current => (current ? { ...current, messages: withMessage(current.messages, { ...saved, clientId: saved.clientId ?? item.clientId }) } : current));
        setPending(current => current.filter(entry => entry.clientId !== item.clientId));
        playSound("sent");
        // Check at once (as before): a counsellor's first reply moves the status to "In progress".
        void poll();
        void app.refreshAccountData();
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Check your connection and try again.";
        setPending(current => current.map(entry => (entry.clientId === item.clientId ? { ...entry, state: "failed", error: reason } : entry)));
      }
    });
  };
  const send = () => {
    const body = message.trim();
    if (!body) return;
    const item: PendingMessage = { clientId: makeClientId(), body, createdAt: new Date().toISOString(), state: "sending" };
    lastActivity.current = Date.now();
    setPending(current => [...current, item]);
    setMessage("");
    deliver(item);
  };
  const onFailedPress = (item: PendingMessage) => AppAlert.alert(
    "Message not sent",
    item.error || "Check your connection and try again.",
    [
      { text: "Delete", style: "destructive", onPress: () => setPending(current => current.filter(entry => entry.clientId !== item.clientId)) },
      { text: "Try again", onPress: () => deliver(item) },
    ],
  );
  const showInfo = (item: DiscussionMessage) => {
    const lines = [`Sent: ${formatDateTime(item.createdAt)}`];
    lines.push(`Delivered: ${item.deliveredAt ? formatDateTime(item.deliveredAt) : "Not yet"}`);
    lines.push(`Seen: ${item.readAt ? formatDateTime(item.readAt) : "Not yet"}`);
    AppAlert.alert("Message info", lines.join("\n"));
  };
  const close = async () => {
    try { await apiSetDiscussionStatus(String(id), app.user?.role === "member" ? "CANCELLED" : "COMPLETED"); await refresh(); await app.refreshAccountData(); }
    catch (error) { AppAlert.alert("Could not update discussion", error instanceof Error ? error.message : "Please try again."); }
  };
  const submitRating = async () => {
    if (!discussion) return;
    try {
      setSubmittingRating(true);
      await apiCreateRating({ discussionId: discussion.id, score: rating, feedback: feedback.trim() || undefined });
      setRatingSent(true);
      AppAlert.alert("Rating submitted", "Thank you. Your feedback is pending moderation.");
    } catch (error) { AppAlert.alert("Rating not submitted", error instanceof Error ? error.message : "Please try again."); }
    finally { setSubmittingRating(false); }
  };

  if (loading) return <Screen><BackLink /><LoadingBlock label="Opening conversation…" /></Screen>;
  if (!discussion) return <Screen>
    <BackLink />
    <EmptyState icon="lock-closed-outline" title="Discussion unavailable" message="This discussion could not be opened. You may not have access to it." actionLabel="Go back" onAction={() => router.back()} />
  </Screen>;

  const closed = discussionIsClosed(discussion.status);
  const isMember = app.user?.role === "member";
  const canSend = !!message.trim();

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={KEYBOARD_BEHAVIOR}>
    <Screen scrollRef={scrollRef} style={{ gap: 14 }} onRefresh={onPull} refreshing={pulling}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <BackLink />
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Conversation sounds"
          accessibilityState={{ checked: soundsOn }}
          accessibilityHint={soundsOn ? "Turns message sounds off" : "Turns message sounds on"}
          onPress={() => setSoundsOn(!soundsOn)}
          hitSlop={6}
          style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.7 : 1 })}
        >
          <Ionicons name={soundsOn ? "volume-high-outline" : "volume-mute-outline"} size={20} color={soundsOn ? colors.primary : colors.muted} />
        </Pressable>
      </View>
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
          onPress={() => AppAlert.alert("Close discussion?", "This will end the active discussion and release the counsellor assignment.", [{ text: "Keep open", style: "cancel" }, { text: "Confirm", style: "destructive", onPress: () => void close() }])}
        /> : null}
      </Card>

      {discussion.messages.map(item => {
        const mine = item.author.id === me;
        const counsellor = item.author.role === "COUNSELLOR";
        const author = item.author.displayName || (counsellor ? "Counsellor" : "Member");
        const receipt = mine ? receiptFor(item) : null;
        return <View
          key={item.id}
          accessible
          accessibilityLabel={`${mine ? "You" : author} said: ${item.body}. ${formatDateTime(item.createdAt)}${receipt ? `. ${RECEIPT_LABEL[receipt]}` : ""}`}
          accessibilityHint={mine ? "Double tap for message info" : undefined}
          onAccessibilityTap={mine ? () => showInfo(item) : undefined}
          style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "88%", backgroundColor: mine ? colors.primary : colors.surface, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, borderBottomRightRadius: mine ? 5 : 18, borderBottomLeftRadius: mine ? 18 : 5, borderWidth: mine ? 0 : 1, borderColor: colors.line, gap: 4 }}
        >
          {!mine ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 12 }}>{author}</Text>
            {counsellor ? <Ionicons name="shield-checkmark" size={13} color={colors.primary} /> : null}
          </View> : null}
          <Text selectable style={{ color: mine ? colors.white : colors.ink, lineHeight: 22, fontSize: 15 }}>{item.body}</Text>
          {/* Time, plus ticks on your own messages. Tap them for when it was delivered and seen. */}
          <Pressable disabled={!mine} onPress={() => showInfo(item)} hitSlop={8} accessibilityRole={mine ? "button" : undefined} accessibilityLabel={mine ? "Message info" : undefined} style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" }}>
            <Text style={{ color: mine ? TICK : colors.muted, fontSize: 11 }}>{formatDateTime(item.createdAt)}</Text>
            {receipt ? <Ticks receipt={receipt} /> : null}
          </Pressable>
        </View>;
      })}

      {pending.map(item => {
        const failed = item.state === "failed";
        return <Pressable
          key={item.clientId}
          disabled={!failed}
          onPress={() => onFailedPress(item)}
          accessibilityRole={failed ? "button" : undefined}
          accessibilityLabel={`You said: ${item.body}. ${failed ? "Not sent. Double tap to try again or delete." : "Sending."}`}
          style={{ alignSelf: "flex-end", maxWidth: "88%", gap: 4 }}
        >
          <View style={{ backgroundColor: failed ? colors.error : colors.primary, opacity: failed ? 0.92 : 0.85, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, borderBottomRightRadius: 5, gap: 4 }}>
            <Text style={{ color: colors.white, lineHeight: 22, fontSize: 15 }}>{item.body}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" }}>
              <Text style={{ color: TICK, fontSize: 11 }}>{failed ? "Not sent" : formatTime(item.createdAt)}</Text>
              <Ticks receipt={item.state} />
            </View>
          </View>
          {failed ? <Text style={{ color: colors.error, fontSize: 12, fontWeight: "700", alignSelf: "flex-end" }}>Tap to try again</Text> : null}
        </Pressable>;
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
        accessibilityLabel="Your message"
        style={{ flex: 1, maxHeight: 128, minHeight: 48, backgroundColor: colors.surfaceSecondary, borderRadius: 22, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13, fontSize: 15, color: colors.ink, textAlignVertical: "top" }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={send}
        style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: canSend ? colors.primary : "#C7CCEF", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}
      >
        <Ionicons name="send" size={20} color={colors.white} />
      </Pressable>
    </View> : null}
  </KeyboardAvoidingView>;
}
