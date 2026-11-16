import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button, Field, Pill, BackLink, SectionHeader, OptionCard, Chip, EmptyState, StarRating, IconBadge } from "@/src/components/UI";
import type { IconName } from "@/src/components/UI";
import { DatePickerField } from "@/src/components/Forms";
import { RescheduleForm } from "@/src/components/RescheduleForm";
import { ResourceCard, ScholarshipCard } from "@/src/components/ContentCards";
import { toDateString } from "@/src/lib/validation";
import { appointmentTone, formatDateTime, formatShortDate, formatTimeRange, humanize } from "@/src/lib/format";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
import { apiCreateActivity, apiListActivities, apiNotificationPage, apiRescheduleAppointment, ActivityRecord, UserNotification, apiDiscussionTopics, apiListAppointments, apiCreateAppointment, apiUpdateAppointmentStatus, DiscussionTopic, AppointmentRecord, apiMyRatings, apiCreateRating, MyRating } from "@/src/lib/api";

const MOODS: { value: string; icon: IconName }[] = [
  { value: "Great", icon: "happy" },
  { value: "Good", icon: "happy-outline" },
  { value: "Okay", icon: "remove-circle-outline" },
  { value: "Low", icon: "sad-outline" },
  { value: "Stressed", icon: "thunderstorm-outline" },
];
const TIME_SLOTS = [{ label: "10:00 AM", value: "10:00" }, { label: "1:00 PM", value: "13:00" }, { label: "3:30 PM", value: "15:30" }];
const QUESTIONS: { question: string; options: string[] }[] = [
  { question: "Which activity sounds most interesting?", options: ["Building or fixing things", "Helping people", "Analysing information"] },
  { question: "Which strength sounds most like you?", options: ["Practical problem-solving", "Listening and explaining", "Logic and patterns"] },
  { question: "What kind of problem would you enjoy solving?", options: ["Engineering challenge", "Community challenge", "Data or research challenge"] },
];
const KNOWN = ["ai", "booking", "assessment", "wellness", "goals", "notifications", "history", "discussion", "saved", "resources", "career", "business", "universities", "help"];

export default function FeatureScreen() {
  const { slug: raw } = useLocalSearchParams<{ slug: string }>(); const slug = String(raw || "resources");
  const app = useApp();
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => { const next = new Date(); next.setDate(next.getDate() + 1); return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`; }); const [time, setTime] = useState("10:00");
  const [mood, setMood] = useState("Okay"); const [goal, setGoal] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [remoteNotifications, setRemoteNotifications] = useState<UserNotification[]>([]);
  const [bookingTopics, setBookingTopics] = useState<DiscussionTopic[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [myRatings, setMyRatings] = useState<MyRating[]>([]);
  const [appointmentScores, setAppointmentScores] = useState<Record<string, number>>({});
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [saving, setSaving] = useState(false);
  const [noticesMore, setNoticesMore] = useState(false);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const loadNotices = async (append: boolean) => {
    try {
      setNoticesLoading(true);
      const before = append ? remoteNotifications[remoteNotifications.length - 1]?.createdAt : undefined;
      const page = await apiNotificationPage({ limit: 20, before });
      setRemoteNotifications(current => append ? [...current, ...page.items.filter(item => !current.some(existing => existing.id === item.id))] : page.items);
      setNoticesMore(page.hasMore);
      if (!append) void app.refreshNotifications();
    } catch (error) { Alert.alert("Notifications unavailable", error instanceof Error ? error.message : "Please try again."); }
    finally { setNoticesLoading(false); }
  };
  useEffect(() => { if (slug === "notifications") void loadNotices(false); }, [slug]);
  const refreshActivities = async () => {
    try {
      setRecords(await apiListActivities());
    } catch (error) { Alert.alert("Activity data unavailable", error instanceof Error ? error.message : "Please try again."); }
  };
  useEffect(() => { if (["assessment", "wellness", "goals", "history"].includes(slug)) void refreshActivities(); }, [slug]);
  useEffect(() => {
    if (slug !== "history") return;
    Promise.all([apiListAppointments(), apiMyRatings()]).then(([items, ratings]) => { setAppointments(items); setMyRatings(ratings); }).catch(error => Alert.alert("Appointment history unavailable", error instanceof Error ? error.message : "Please try again."));
  }, [slug]);
  useEffect(() => {
    if (slug !== "booking") return;
    Promise.all([apiDiscussionTopics(), apiListAppointments()]).then(([availableTopics, items]) => {
      setBookingTopics(availableTopics); setAppointments(items);
      setSelectedTopicId(current => availableTopics.some(item => item.id === current) ? current : availableTopics[0]?.id || "");
    }).catch(error => Alert.alert("Appointments unavailable", error instanceof Error ? error.message : "Please try again."));
  }, [slug]);
  const titleMap: Record<string, string> = { ai: "Automated support", booking: "Appointments", assessment: "Career assessment", wellness: "Wellbeing check-in", goals: "Personal goals", notifications: "Notifications", history: "Activity history", discussion: "Private discussion", saved: "Saved items", resources: "Resources library", career: "Career growth", business: "Business guidance", universities: "Universities", help: "Help & support" };
  const title = titleMap[slug] || "Mentorship+";

  const requestAppointment = async () => {
    const [year, month, day] = date.split("-").map(Number);
    const start = new Date(year, month - 1, day, Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
    const calendarDateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && start.getFullYear() === year && start.getMonth() === month - 1 && start.getDate() === day;
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    if (!calendarDateValid || !Number.isFinite(start.getTime()) || start <= new Date()) return Alert.alert("Choose a valid time", "Appointments must be requested for a real future date and time.");
    try { setSaving(true); await apiCreateAppointment({ topicId: selectedTopicId, startsAt: start.toISOString(), endsAt: end.toISOString(), notes: note.trim() || undefined }); setNote(""); const items = await apiListAppointments(); setAppointments(items); await app.refreshAccountData(); Alert.alert("Appointment requested", "Your request has been sent. It will appear as requested until the counsellor confirms it."); }
    catch (error) { Alert.alert("Appointment not requested", error instanceof Error ? error.message : "Please choose another time."); }
    finally { setSaving(false); }
  };

  const cancelAppointment = (item: AppointmentRecord) => Alert.alert("Cancel appointment?", "This will cancel your appointment request.", [{ text: "Keep", style: "cancel" }, { text: "Cancel appointment", style: "destructive", onPress: async () => { try { await apiUpdateAppointmentStatus(item.id, "CANCELLED"); setAppointments(await apiListAppointments()); await app.refreshAccountData(); } catch (error) { Alert.alert("Could not cancel", error instanceof Error ? error.message : "Please try again."); } } }]);

  const reschedule = async (item: AppointmentRecord, startsAtIso: string, endsAtIso: string) => {
    try {
      setSaving(true);
      await apiRescheduleAppointment(item.id, startsAtIso, endsAtIso);
      setReschedulingId(null); setAppointments(await apiListAppointments()); await app.refreshAccountData();
      Alert.alert("New time sent", "Your counsellor will be asked to confirm the new time.");
    } catch (error) { Alert.alert("Could not reschedule", error instanceof Error ? error.message : "Please choose another time."); }
    finally { setSaving(false); }
  };
  const confirmProposedTime = async (item: AppointmentRecord) => {
    try { await apiUpdateAppointmentStatus(item.id, "CONFIRMED"); setAppointments(await apiListAppointments()); await app.refreshAccountData(); }
    catch (error) { Alert.alert("Could not confirm", error instanceof Error ? error.message : "Please try again."); }
  };

  const saveAssessment = async () => {
    const result = answers.some(item => /people|listening|community|helping/i.test(item)) ? "people-focused paths" : answers.some(item => /analysing|logic|data|research/i.test(item)) ? "analytical and research paths" : "practical and technical paths";
    try { setSaving(true); await apiCreateActivity("CAREER_ASSESSMENT", { answers, result }); await refreshActivities(); Alert.alert("Assessment saved", `Your responses suggest exploring ${result}. This is a reflection tool, not a validated assessment.`); } catch (error) { Alert.alert("Could not save assessment", error instanceof Error ? error.message : "Please try again."); } finally { setSaving(false); }
  };

  const saveCheckin = async () => { try { setSaving(true); await apiCreateActivity("WELLBEING_CHECKIN", { mood, note }); setNote(""); await refreshActivities(); Alert.alert("Check-in saved", "Your private entry is saved to your account and is not included in general admin analytics."); } catch (error) { Alert.alert("Could not save check-in", error instanceof Error ? error.message : "Please try again."); } finally { setSaving(false); } };

  const addGoal = async () => { if (!goal.trim()) return Alert.alert("Add a goal", "Enter a short goal first."); try { setSaving(true); await app.addGoal(goal.trim()); setGoal(""); await refreshActivities(); } catch (error) { Alert.alert("Could not save goal", error instanceof Error ? error.message : "Please try again."); } finally { setSaving(false); } };

  const contentList = app.resources.filter(resource => slug === "resources" || resource.category.toLowerCase().includes(slug));
  const goals = records.filter(record => record.type === "PERSONAL_GOAL");
  const checkins = records.filter(record => record.type === "WELLBEING_CHECKIN");
  const hasAssessment = records.some(record => record.type === "CAREER_ASSESSMENT");

  return <Screen>
    <BackLink />
    <Heading title={title} subtitle={slug === "ai" ? "Automated guidance is not a substitute for a qualified human counsellor." : undefined} />

    {slug === "ai" && <EmptyState icon="chatbubbles-outline" title="Automated counselling is not available yet" message="We do not provide simulated AI conversations. You can start a private discussion with a human counsellor or request an appointment." actionLabel="Talk to a human counsellor" onAction={() => router.push("/(student)/counselling")} />}

    {slug === "booking" && <>
      <Card style={{ gap: 14 }}>
        <Heading title="Request a counselling session" small subtitle="Select a topic and a future time. A suitable counsellor will be assigned based on topic and availability." />
        <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13 }}>Topic</Text>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {bookingTopics.map(item => <OptionCard key={item.id} title={item.name} description={item.description} selected={selectedTopicId === item.id} onPress={() => setSelectedTopicId(item.id)} />)}
          {!bookingTopics.length ? <Text style={{ color: colors.muted }}>No counselling topics are currently available.</Text> : null}
        </View>
        <DatePickerField label="Appointment date" value={date} onChange={setDate} minDate={toDateString(new Date())} maxDate={`${new Date().getFullYear() + 2}-12-31`} required />
        <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13 }}>Start time</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{TIME_SLOTS.map(t => <Chip key={t.value} label={t.label} accessibilityRole="radio" selected={time === t.value} onPress={() => setTime(t.value)} />)}</View>
        <Field label="Note for your counsellor" optional value={note} onChangeText={setNote} placeholder="Anything the counsellor should know?" multiline maxLength={2000} editable={!saving} />
        <Button title={saving ? "Requesting…" : "Request appointment"} loading={saving} disabled={!selectedTopicId} onPress={() => void requestAppointment()} />
      </Card>
      <SectionHeader title="Your appointments" />
      {appointments.length ? appointments.map(item => <Card key={item.id}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 16, flex: 1 }}>{item.topic?.name || "Counselling"}</Text>
          <Pill label={humanize(item.status)} tone={appointmentTone(item.status)} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="calendar-outline" size={16} color={colors.muted} /><Text style={{ color: colors.ink, flex: 1 }}>{formatTimeRange(item.startsAt, item.endsAt)}</Text></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="person-outline" size={16} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 13, flex: 1 }}>{item.counsellor.user.displayName || "Assigned counsellor"}</Text></View>
        {item.status === "RESCHEDULED" && item.rescheduledById && item.rescheduledById !== app.user?.id ? <Button title="Confirm the new time" icon="checkmark" size="sm" onPress={() => void confirmProposedTime(item)} /> : null}
        {item.status === "RESCHEDULED" && item.rescheduledById === app.user?.id ? <Text style={{ color: colors.muted, fontSize: 13 }}>Waiting for your counsellor to confirm the new time.</Text> : null}
        {["REQUESTED", "CONFIRMED", "RESCHEDULED"].includes(item.status) && new Date(item.startsAt).getTime() > Date.now() ? <Button title={reschedulingId === item.id ? "Hide reschedule" : "Reschedule"} icon="time-outline" variant="secondary" size="sm" onPress={() => setReschedulingId(current => current === item.id ? null : item.id)} /> : null}
        {reschedulingId === item.id ? <RescheduleForm startsAt={item.startsAt} endsAt={item.endsAt} busy={saving} onSubmit={(a, b) => void reschedule(item, a, b)} onClose={() => setReschedulingId(null)} /> : null}
        {["REQUESTED", "CONFIRMED", "RESCHEDULED"].includes(item.status) ? <Button title="Cancel appointment" variant="dangerSoft" size="sm" onPress={() => cancelAppointment(item)} /> : null}
      </Card>) : <EmptyState icon="calendar-outline" title="No appointments yet" message="Request a session above and it will appear here." />}
    </>}

    {slug === "assessment" && <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <IconBadge icon="compass-outline" size={44} />
        <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17 }}>{hasAssessment ? "Explore your career interests" : "A few questions about you"}</Text></View>
      </View>
      <Text style={{ color: colors.muted, lineHeight: 21 }}>Answer three reflection questions to explore possible career interests. This is not a validated psychological assessment.</Text>
      {QUESTIONS.map((q, i) => <View key={q.question} style={{ gap: 8 }}>
        <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 15 }}>{i + 1}. {q.question}</Text>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {q.options.map(opt => <OptionCard key={opt} title={opt} selected={answers[i] === opt} onPress={() => setAnswers(current => { const next = [...current]; next[i] = opt; return next; })} />)}
        </View>
      </View>)}
      <Button title={saving ? "Saving…" : "Save assessment result"} loading={saving} disabled={answers.length !== 3 || answers.some(item => !item)} onPress={() => void saveAssessment()} />
      {hasAssessment && <Pill label="Result saved to your account" tone="green" />}
    </Card>}

    {slug === "wellness" && <>
      <Card style={{ gap: 14 }}>
        <Heading title="How are you feeling today?" small subtitle="There is no right or wrong answer." />
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{MOODS.map(m => <Chip key={m.value} label={m.value} icon={m.icon} accessibilityRole="radio" selected={mood === m.value} onPress={() => setMood(m.value)} />)}</View>
        <Field label="Private journal note" optional value={note} onChangeText={setNote} placeholder="Anything you want to reflect on…" multiline editable={!saving} />
        <Button title={saving ? "Saving…" : "Save check-in"} loading={saving} onPress={() => void saveCheckin()} />
      </Card>
      <SectionHeader title="Recent check-ins" />
      {checkins.map(record => <Card key={record.id}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{String(record.payload.mood || "Check-in")}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{formatShortDate(record.createdAt)}</Text></View>
        {typeof record.payload.note === "string" && record.payload.note ? <Text style={{ color: colors.muted, lineHeight: 20 }}>{record.payload.note}</Text> : null}
      </Card>)}
      {!checkins.length ? <EmptyState icon="heart-outline" title="No check-ins yet" message="Your private check-ins will appear here." /> : null}
    </>}

    {slug === "goals" && <>
      <Card>
        <Field label="Add a personal goal" value={goal} onChangeText={setGoal} placeholder="e.g. Revise biology for 20 minutes" returnKeyType="done" onSubmitEditing={() => void addGoal()} editable={!saving} />
        <Button title={saving ? "Saving…" : "Add goal"} icon="add" loading={saving} onPress={() => void addGoal()} />
      </Card>
      {goals.map(record => { const done = record.payload.done === true; const label = String(record.payload.title || "Personal goal"); return <Pressable key={record.id} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={label} onPress={async () => { try { await app.toggleGoal(record.id); await refreshActivities(); } catch (error) { Alert.alert("Goal not updated", error instanceof Error ? error.message : "Please try again."); } }}>
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={26} color={done ? colors.primary : colors.mutedLight} />
          <Text style={{ color: done ? colors.muted : colors.ink, flex: 1, fontWeight: "700", fontSize: 15, textDecorationLine: done ? "line-through" : "none" }}>{label}</Text>
          <Pill label={done ? "Done" : "In progress"} tone={done ? "green" : "blue"} />
        </Card>
      </Pressable>; })}
      {!goals.length ? <EmptyState icon="checkmark-done-outline" title="No goals yet" message="Add one small thing you’d like to do this week." /> : null}
    </>}

    {slug === "notifications" && <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 13, flex: 1 }}>{app.unreadCount ? `${app.unreadCount} unread` : "Everything is read"}</Text>
        {app.unreadCount > 0 ? <Button title="Mark all as read" icon="checkmark-done-outline" variant="secondary" size="sm" onPress={async () => { try { await app.markAllRead(); setRemoteNotifications(current => current.map(item => item.readAt ? item : { ...item, readAt: new Date().toISOString() })); } catch (error) { Alert.alert("Could not update", error instanceof Error ? error.message : "Please try again."); } }} /> : null}
      </View>
      {remoteNotifications.map(n => <Pressable key={n.id} accessibilityRole="button" accessibilityLabel={`${n.title}. ${n.body}. ${n.readAt ? "Read" : "Unread, tap to mark as read"}`} onPress={async () => { if (n.readAt) return; try { await app.markRead(n.id); setRemoteNotifications(current => current.map(item => item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item)); } catch (error) { Alert.alert("Notification not updated", error instanceof Error ? error.message : "Please try again."); } }}>
        <Card style={{ borderColor: n.readAt ? colors.cardBorder : colors.primary, borderWidth: n.readAt ? 1 : 1.5, backgroundColor: n.readAt ? colors.surface : colors.brandSurface }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}><Text style={{ color: colors.ink, fontWeight: "800", flex: 1, fontSize: 15 }}>{n.title}</Text>{!n.readAt && <Pill label="New" tone="green" />}</View>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>{n.body}</Text>
          <Text style={{ color: colors.mutedLight, fontSize: 12 }}>{formatDateTime(n.createdAt)}</Text>
        </Card>
      </Pressable>)}
      {noticesMore ? <Button title={noticesLoading ? "Loading…" : "Load earlier notifications"} variant="secondary" loading={noticesLoading} onPress={() => void loadNotices(true)} /> : null}
      {!remoteNotifications.length && !noticesLoading && <EmptyState icon="notifications-outline" title="You’re all caught up" message="You have no notifications yet." />}
    </>}

    {slug === "history" && <>
      <SectionHeader title="Your saved activities" />
      {records.map(record => <Card key={record.id}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{humanize(record.type)}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{formatShortDate(record.createdAt)}</Text></View>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>{record.type === "PERSONAL_GOAL" ? String(record.payload.title || "Personal goal") : record.type === "WELLBEING_CHECKIN" ? `Mood: ${String(record.payload.mood || "—")}` : `Result: ${String(record.payload.result || "Saved")}`}</Text>
      </Card>)}
      <SectionHeader title="Appointment history" />
      {appointments.map(item => { const submitted = myRatings.find(rating => rating.appointmentId === item.id); return <Card key={item.id}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}><Text style={{ color: colors.ink, fontWeight: "800", flex: 1 }}>{item.topic?.name || "Counselling"}</Text><Pill label={humanize(item.status)} tone={appointmentTone(item.status)} /></View>
        <Text style={{ color: colors.muted }}>{formatDateTime(item.startsAt)}</Text>
        {item.status === "COMPLETED" && (submitted ? <Text style={{ color: colors.primary, fontWeight: "700" }}>Rating submitted · {submitted.score}/5 · {submitted.moderationStatus.toLowerCase()}</Text> : <>
          <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13 }}>How was this session?</Text>
          <StarRating value={appointmentScores[item.id] || 0} onChange={score => setAppointmentScores(current => ({ ...current, [item.id]: score }))} label="Rate this appointment" />
          <Button title="Submit appointment rating" size="sm" disabled={!appointmentScores[item.id]} onPress={async () => { try { await apiCreateRating({ appointmentId: item.id, score: appointmentScores[item.id] }); setMyRatings(await apiMyRatings()); Alert.alert("Rating submitted", "Thank you. Your feedback is pending moderation."); } catch (error) { Alert.alert("Rating not submitted", error instanceof Error ? error.message : "Please try again."); } }} />
        </>)}
      </Card>; })}
      {!records.length && !appointments.length ? <EmptyState icon="time-outline" title="Nothing here yet" message="Your completed activities and appointments will appear here." /> : null}
    </>}

    {slug === "discussion" && <EmptyState icon="chatbubble-ellipses-outline" title="Private discussions have moved to Counselling" actionLabel="Open counselling" onAction={() => router.push("/(student)/counselling")} />}

    {slug === "saved" && <>
      <SectionHeader title="Saved resources" />
      {app.resources.filter(r => app.savedResources.includes(r.id)).map(r => <ResourceCard key={r.id} item={r} saved onToggleSave={() => app.toggleResource(r.id)} />)}
      <SectionHeader title="Saved scholarships" />
      {app.scholarships.filter(sch => app.savedScholarships.includes(sch.id)).map(sch => <ScholarshipCard key={sch.id} item={sch} saved onToggleSave={() => app.toggleScholarship(sch.id)} />)}
      {!app.savedResources.length && !app.savedScholarships.length && <EmptyState icon="heart-outline" title="Nothing saved yet" message="Open Explore and tap the heart on an item to save it." actionLabel="Go to Explore" onAction={() => router.push("/(student)/explore")} />}
    </>}

    {(slug === "resources" || slug === "career" || slug === "business") && <>
      {contentList.map(r => <ResourceCard key={r.id} item={r} saved={app.savedResources.includes(r.id)} onToggleSave={() => app.toggleResource(r.id)} />)}
      {!contentList.length && <EmptyState icon="book-outline" title="Nothing published here yet" message="Check back after administrators publish relevant content." />}
    </>}

    {slug === "universities" && <EmptyState icon="school-outline" title="University directory" message="A verified university directory has not been connected to this account yet. We are not displaying sample institutions or unverified admission information here." />}

    {slug === "help" && <>
      {[
        ["Is NIN verification available?", "No. NIN verification is not connected to an authorised verification provider, and the app does not claim that your NIN has been verified."],
        ["Are scholarships verified?", "Opportunities are published by Mentorship+ administrators. Confirm eligibility and deadlines directly with the provider before applying."],
        ["Can counsellors see my journal?", "Your private wellbeing entries are tied to your account and are not included in general administrator analytics or counsellor discussion access."],
        ["Is automated AI counselling available?", "No. This build does not simulate AI conversations. You can contact a human counsellor through the counselling feature."]
      ].map(([q, a]) => <Card key={q} style={{ gap: 6 }}><Text accessibilityRole="header" style={{ color: colors.ink, fontWeight: "800", fontSize: 15 }}>{q}</Text><Text style={{ color: colors.muted, lineHeight: 21 }}>{a}</Text></Card>)}
    </>}

    {!KNOWN.includes(slug) && <EmptyState icon="construct-outline" title="This area is part of the Mentorship+ MVP" message="Use the main navigation to explore available features." />}
  </Screen>;
}
