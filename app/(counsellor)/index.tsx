import React, { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AppAlert } from "@/src/lib/alert";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Button, ButtonRow, Pill, Avatar, HeroCard, SectionHeader, StatTile, Segmented, PressableCard, EmptyState, LoadingBlock } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { appointmentTone, availabilityTone, discussionIsClosed, discussionTone, formatDateTime, humanize, pluralize } from "@/src/lib/format";
import { useApp } from "@/src/context/AppContext";
import { RescheduleForm } from "@/src/components/RescheduleForm";
import { InviteCounsellorCard } from "@/src/components/InviteCounsellorCard";
import { apiCounsellorMe, apiCounsellorSetAvailability, apiListDiscussions, apiListAppointments, apiUpdateAppointmentStatus, apiRescheduleAppointment, CounsellorSelf, DiscussionRecord, AppointmentRecord } from "@/src/lib/api";

type Availability = "AVAILABLE" | "OFFLINE" | "ON_LEAVE";
const CAPACITY = 5;

export default function CounsellorWorkspace() {
  const app = useApp();
  const [profile, setProfile] = useState<CounsellorSelf | null>(null);
  const [discussions, setDiscussions] = useState<DiscussionRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  // Only counsellors can reach this screen: the root layout guards it (app/_layout.tsx) and moves people to the
  // right place when they sign in or out, so this screen does not redirect on its own.

  const refresh = useCallback(async (silent = false) => {
    try { const [me, inbox, sessions] = await Promise.all([apiCounsellorMe(), apiListDiscussions(), apiListAppointments()]); setProfile(me); setDiscussions(inbox); setAppointments(sessions); }
    catch (error) { if (!silent) AppAlert.alert("Counsellor workspace unavailable", error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); }
  }, []);
  // Load on first visit, then quietly refresh whenever the workspace is shown again (new assignments, replies).
  const loadedOnce = useRef(false);
  useFocusEffect(useCallback(() => {
    if (app.user?.role !== "counsellor") return;
    void refresh(loadedOnce.current);
    loadedOnce.current = true;
  }, [refresh, app.user?.role]));

  const onRefresh = async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } };

  const setAvailability = async (availability: Availability) => {
    try { setSaving(true); await apiCounsellorSetAvailability(availability); await refresh(); }
    catch (error) { AppAlert.alert("Availability not updated", error instanceof Error ? error.message : "Please try again."); }
    finally { setSaving(false); }
  };

  const updateAppointment = async (item: AppointmentRecord, status: "CONFIRMED" | "COMPLETED" | "NO_SHOW", errorTitle: string) => {
    try { setUpdatingId(item.id); await apiUpdateAppointmentStatus(item.id, status); await refresh(); }
    catch (error) { AppAlert.alert(errorTitle, error instanceof Error ? error.message : "Please try again."); }
    finally { setUpdatingId(null); }
  };

  const proposeNewTime = async (item: AppointmentRecord, startsAt: string, endsAt: string) => {
    try { setUpdatingId(item.id); await apiRescheduleAppointment(item.id, startsAt, endsAt); setReschedulingId(null); await refresh(); AppAlert.alert("New time sent", "The member will be asked to confirm it."); }
    catch (error) { AppAlert.alert("Could not reschedule", error instanceof Error ? error.message : "Please choose another time."); }
    finally { setUpdatingId(null); }
  };

  // Signing out returns to the sign-in screen automatically (see app/_layout.tsx).
  const signOut = () => AppAlert.alert("Sign out?", "Return to sign in?", [{ text: "Stay", style: "cancel" }, { text: "Sign out", onPress: async () => { await app.logout(); } }]);

  const active = discussions.filter(item => !discussionIsClosed(item.status));
  const activeCount = profile?.activeDiscussions ?? 0;
  const atCapacity = activeCount >= CAPACITY;
  const current = (profile?.availability as Availability | undefined);
  // Open conversations first, then closed ones, so nothing needing a reply is buried.
  const inbox = [...discussions].sort((a, b) => Number(discussionIsClosed(a.status)) - Number(discussionIsClosed(b.status)));

  return <Screen onRefresh={onRefresh} refreshing={refreshing}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Avatar name={app.user?.name} uri={app.user?.avatarUrl} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Welcome back</Text>
        <Text accessibilityRole="header" numberOfLines={1} style={{ color: colors.ink, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 }}>{app.user?.name || "Counsellor"}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={app.unreadCount ? `Notifications, ${app.unreadCount} unread` : "Notifications"} onPress={() => router.push({ pathname: "/feature/[slug]", params: { slug: "notifications" } })} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="notifications-outline" size={21} color={colors.ink} />
        {app.unreadCount > 0 ? <View style={{ position: "absolute", right: 3, top: 3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.white, fontSize: 10, fontWeight: "800" }}>{app.unreadCount > 9 ? "9+" : app.unreadCount}</Text></View> : null}
      </Pressable>
      <Button title="Sign out" variant="ghost" size="sm" icon="log-out-outline" onPress={signOut} />
    </View>

    <HeroCard tone="primary" icon="people-outline" title="Support within your assigned topics." body={`Only discussions assigned to your account are shown here. Your active caseload is limited to ${CAPACITY}.`} />

    {loading ? <LoadingBlock label="Loading your workspace…" /> : <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <StatTile icon="pricetags-outline" label="Assigned topics" value={profile?.topics.length ?? 0} />
        <StatTile icon="chatbubbles-outline" label="Active discussions" value={`${activeCount}/${CAPACITY}`} tone={atCapacity ? "amber" : "brand"} hint={atCapacity ? "At capacity" : undefined} />
        <StatTile icon="star-outline" label="Average rating" value={profile?.averageRating?.toFixed(1) ?? "—"} hint={`${profile?.ratingCount ?? 0} approved`} />
      </View>

      <SectionHeader title="Availability" subtitle="Set whether the assignment system can route new discussions to you." right={<Pill label={humanize(profile?.availability || "OFFLINE")} tone={availabilityTone(profile?.availability)} />} />
      <Card>
        <Segmented<Availability>
          value={current && ["AVAILABLE", "OFFLINE", "ON_LEAVE"].includes(current) ? current : "OFFLINE"}
          disabled={saving}
          onChange={(next) => {
            if (next === current) return;
            if (next === "AVAILABLE" && atCapacity) return AppAlert.alert("At your caseload limit", `You already have ${CAPACITY} active discussions. Complete one before switching to Available.`);
            void setAvailability(next);
          }}
          options={[{ label: "Available", value: "AVAILABLE" }, { label: "Offline", value: "OFFLINE" }, { label: "On leave", value: "ON_LEAVE" }]}
        />
        {atCapacity ? <Text style={{ color: colors.warning, fontSize: 13, lineHeight: 19 }}>You’re at your caseload limit of {CAPACITY}, so you can’t switch to Available until a discussion is completed.</Text> : null}
      </Card>

      <SectionHeader title="Your assigned topics" />
      {profile?.topics.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{profile.topics.map(topic => <Pill key={topic.id} label={topic.name} tone="blue" />)}</View> : <Text style={{ color: colors.muted }}>No topics are assigned to you yet. An administrator can assign them.</Text>}

      <SectionHeader title="Grow the team" subtitle="Know someone who would be a good counsellor?" />
      <InviteCounsellorCard />

      <SectionHeader title="Discussion inbox" subtitle={discussions.length ? `${pluralize(active.length, "active conversation")} · ${discussions.length} in total` : "Open a discussion to read and reply to the member."} />
      {inbox.length ? inbox.map(item => {
        const messages = item._count?.messages ?? 0;
        return <PressableCard key={item.id} accessibilityLabel={`${item.title}. ${item.topic.name}. ${humanize(item.status)}. ${pluralize(messages, "message")}.`} accessibilityHint="Opens the conversation" onPress={() => router.push({ pathname: "/discussion/[id]", params: { id: item.id } })} style={discussionIsClosed(item.status) ? { opacity: 0.8 } : undefined}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16, lineHeight: 22, flex: 1 }}>{item.title}</Text>
            <Pill label={humanize(item.status)} tone={discussionTone(item.status)} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{item.topic.name} · {pluralize(messages, "message")}</Text>
        </PressableCard>;
      }) : <EmptyState icon="chatbubbles-outline" title="No discussions yet" message="No discussions have been assigned to you yet." />}

      <SectionHeader title="Appointment requests" subtitle="Confirm, complete or record a no-show for your assigned sessions." />
      {appointments.length ? appointments.map(item => <Card key={item.id}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16, flex: 1 }}>{item.member?.displayName || "Member"}</Text>
          <Pill label={humanize(item.status)} tone={appointmentTone(item.status)} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="calendar-outline" size={16} color={colors.muted} />
          <Text style={{ color: colors.muted, flex: 1, fontSize: 13 }}>{item.topic?.name || "Counselling"} · {formatDateTime(item.startsAt)}</Text>
        </View>
        {item.status === "RESCHEDULED" ? <Text style={{ color: colors.muted, fontSize: 13 }}>{item.rescheduledById === app.user?.id ? "Waiting for the member to confirm your proposed time." : "The member proposed a new time."}</Text> : null}
        {item.status === "RESCHEDULED" && item.rescheduledById !== app.user?.id ? <Button title="Confirm new time" icon="checkmark" loading={updatingId === item.id} disabled={!!updatingId} onPress={() => void updateAppointment(item, "CONFIRMED", "Could not confirm")} /> : null}
        {["REQUESTED", "CONFIRMED", "RESCHEDULED"].includes(item.status) && new Date(item.startsAt).getTime() > Date.now() ? <Button title={reschedulingId === item.id ? "Hide reschedule" : "Propose new time"} icon="time-outline" variant="secondary" size="sm" disabled={!!updatingId} onPress={() => setReschedulingId(current => current === item.id ? null : item.id)} /> : null}
        {reschedulingId === item.id ? <RescheduleForm startsAt={item.startsAt} endsAt={item.endsAt} busy={updatingId === item.id} onSubmit={(a, b) => void proposeNewTime(item, a, b)} onClose={() => setReschedulingId(null)} /> : null}
        {item.status === "REQUESTED" ? <Button title="Confirm appointment" icon="checkmark" loading={updatingId === item.id} disabled={!!updatingId} onPress={() => void updateAppointment(item, "CONFIRMED", "Could not confirm")} /> : null}
        {item.status === "CONFIRMED" ? <ButtonRow>
          <Button grow title="Complete" loading={updatingId === item.id} disabled={!!updatingId} onPress={() => void updateAppointment(item, "COMPLETED", "Could not complete")} />
          <Button grow title="No show" variant="secondary" disabled={!!updatingId} onPress={() => void updateAppointment(item, "NO_SHOW", "Could not update")} />
        </ButtonRow> : null}
      </Card>) : <EmptyState icon="calendar-outline" title="No appointment requests yet" message="New requests from members will appear here." />}
      <Button title="Refresh inbox" icon="refresh" variant="secondary" loading={refreshing} onPress={() => void onRefresh()} />
    </>}
  </Screen>;
}
