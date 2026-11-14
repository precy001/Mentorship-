import React, { useEffect, useState } from "react";
import { Alert, Text, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button, Field, Pill, Row } from "@/src/components/UI";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
import { apiCreateActivity, apiListActivities, apiListNotifications, apiMarkNotificationRead, ActivityRecord, UserNotification, apiDiscussionTopics, apiListAppointments, apiCreateAppointment, apiUpdateAppointmentStatus, DiscussionTopic, AppointmentRecord, apiMyRatings, apiCreateRating, MyRating } from "@/src/lib/api";

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
  const refreshActivities = async () => {
    try {
      const [items, notices] = await Promise.all([apiListActivities(), apiListNotifications()]);
      setRecords(items); setRemoteNotifications(notices);
    } catch (error) { Alert.alert("Activity data unavailable", error instanceof Error ? error.message : "Please try again."); }
  };
  useEffect(() => { if (["assessment", "wellness", "goals", "notifications", "history"].includes(slug)) void refreshActivities(); }, [slug]);
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
  const goBack = () => router.back();
  const titleMap: Record<string, string> = { ai: "Automated support", booking: "Appointments", assessment: "Career assessment", wellness: "Wellbeing check-in", goals: "Personal goals", notifications: "Notifications", history: "Activity history", discussion: "Private discussion", saved: "Saved items", resources: "Resources library", career: "Career growth", business: "Business guidance", universities: "Universities", help: "Help & support" };
  const title = titleMap[slug] || "Mentorship+";
  return <Screen>
    <Pressable onPress={goBack}><Text style={{ color: colors.primary, fontWeight: "800", paddingVertical: 4 }}>← Back</Text></Pressable>
    <Heading title={title} subtitle={slug === "ai" ? "Automated guidance is not a substitute for a qualified human counsellor." : undefined} />
    {slug === "ai" && <Card><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17 }}>Automated counselling is not available yet.</Text><Text style={{ color: colors.muted, lineHeight: 21 }}>We do not provide simulated AI conversations. You can start a private discussion with a human counsellor or request an appointment.</Text><Button title="Talk to a human counsellor" onPress={() => router.push("/(student)/counselling")} /></Card>}
    {slug === "booking" && <>
      <Card><Heading title="Request a counselling session" small subtitle="Select a topic and a future time. A suitable counsellor will be assigned based on topic and availability." />
        {bookingTopics.map(item => <Pressable key={item.id} onPress={() => { setSelectedTopicId(item.id);  }} style={{ borderWidth: 1, borderColor: selectedTopicId === item.id ? colors.primary : colors.line, backgroundColor: selectedTopicId === item.id ? colors.softBlue : "#fff", borderRadius: 12, padding: 12, gap: 4 }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{item.name}</Text>{item.description ? <Text style={{ color: colors.muted, fontSize: 12 }}>{item.description}</Text> : null}</Pressable>)}
        <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-11-20" /><Text style={{ color: colors.ink, fontWeight: "700" }}>Start time</Text><View style={{ flexDirection: "row", gap: 8 }}>{[{label:"10:00 AM",value:"10:00"},{label:"1:00 PM",value:"13:00"},{label:"3:30 PM",value:"15:30"}].map(t => <Pressable key={t.value} onPress={() => setTime(t.value)} style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: time === t.value ? colors.primary : colors.softBlue, alignItems: "center" }}><Text style={{ color: time === t.value ? "#fff" : colors.ink, fontWeight: "700", fontSize: 11 }}>{t.label}</Text></Pressable>)}</View>
        <Field label="Optional note" value={note} onChangeText={setNote} placeholder="Anything the counsellor should know?" multiline />
        <Button title={saving ? "Requesting…" : "Request appointment"} disabled={saving || !selectedTopicId} onPress={async () => {
          const [year, month, day] = date.split("-").map(Number);
          const start = new Date(year, month - 1, day, Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
          const calendarDateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && start.getFullYear() === year && start.getMonth() === month - 1 && start.getDate() === day;
          const end = new Date(start.getTime() + 45 * 60 * 1000);
          if (!calendarDateValid || !Number.isFinite(start.getTime()) || start <= new Date()) return Alert.alert("Choose a valid time", "Appointments must be requested for a real future date and time.");
          try { setSaving(true); await apiCreateAppointment({ topicId: selectedTopicId, startsAt: start.toISOString(), endsAt: end.toISOString(), notes: note.trim() || undefined }); setNote(""); const items = await apiListAppointments(); setAppointments(items); await app.refreshAccountData(); Alert.alert("Appointment requested", "Your request has been sent. It will appear as requested until the counsellor confirms it."); }
          catch (error) { Alert.alert("Appointment not requested", error instanceof Error ? error.message : "Please choose another time."); }
          finally { setSaving(false); }
        }} />
      </Card>
      <Heading title="Your appointments" small />
      {appointments.length ? appointments.map(item => <Card key={item.id}><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{item.topic?.name || "Counselling"}</Text><Pill label={item.status.replaceAll("_", " ")} tone={item.status === "CONFIRMED" ? "green" : item.status === "CANCELLED" ? "red" : "amber"} /></Row><Text style={{ color: colors.muted }}>{new Date(item.startsAt).toLocaleString()} – {new Date(item.endsAt).toLocaleTimeString()}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Counsellor: {item.counsellor.user.displayName || "Assigned counsellor"}</Text>{["REQUESTED", "CONFIRMED", "RESCHEDULED"].includes(item.status) ? <Button title="Cancel appointment" variant="ghost" onPress={() => Alert.alert("Cancel appointment?", "This will cancel your appointment request.", [{ text: "Keep", style: "cancel" }, { text: "Cancel appointment", style: "destructive", onPress: async () => { try { await apiUpdateAppointmentStatus(item.id, "CANCELLED"); setAppointments(await apiListAppointments()); await app.refreshAccountData(); } catch (error) { Alert.alert("Could not cancel", error instanceof Error ? error.message : "Please try again."); } } }])} /> : null}</Card>) : <Card><Text style={{ color: colors.muted }}>No appointments yet. Request a session above.</Text></Card>}
    </>}
    {slug === "assessment" && <>
      <Card><Pill label="CAREER EXPLORATION" tone="purple" /><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 18 }}>{records.some(record => record.type === "CAREER_ASSESSMENT") ? "Explore your career interests" : "A few questions about you"}</Text><Text style={{ color: colors.muted, lineHeight: 21 }}>Answer three reflection questions to explore possible career interests. This is not a validated psychological assessment.</Text>
      {["Which activity sounds most interesting?", "Which strength sounds most like you?", "What kind of problem would you enjoy solving?"].map((question, i) => <View key={question} style={{ gap: 8, marginTop: 8 }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{i + 1}. {question}</Text>{(i === 0 ? ["Building or fixing things", "Helping people", "Analysing information"] : i === 1 ? ["Practical problem-solving", "Listening and explaining", "Logic and patterns"] : ["Engineering challenge", "Community challenge", "Data or research challenge"]).map(opt => <Pressable key={opt} onPress={() => setAnswers(current => { const next = [...current]; next[i] = opt; return next; })} style={{ padding: 11, borderRadius: 11, backgroundColor: answers[i] === opt ? colors.softBlue : "#fff", borderWidth: 1, borderColor: answers[i] === opt ? colors.primary : colors.line }}><Text style={{ color: colors.ink }}>{opt}</Text></Pressable>)}</View>)}
      <Button title={saving ? "Saving…" : "Save assessment result"} disabled={saving || answers.length !== 3 || answers.some(item => !item)} onPress={async () => { const result = answers.some(item => /people|listening|community|helping/i.test(item)) ? "people-focused paths" : answers.some(item => /analysing|logic|data|research/i.test(item)) ? "analytical and research paths" : "practical and technical paths"; try { setSaving(true); await apiCreateActivity("CAREER_ASSESSMENT", { answers, result }); await refreshActivities(); Alert.alert("Assessment saved", `Your responses suggest exploring ${result}. This is a reflection tool, not a validated assessment.`); } catch (error) { Alert.alert("Could not save assessment", error instanceof Error ? error.message : "Please try again."); } finally { setSaving(false); } }} />
      {records.some(record => record.type === "CAREER_ASSESSMENT") && <Pill label="Result saved to your account" tone="green" />}
      </Card>
    </>}
    {slug === "wellness" && <>
      <Card><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 18 }}>How are you feeling today?</Text><Text style={{ color: colors.muted }}>There is no right or wrong answer.</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{["Great", "Good", "Okay", "Low", "Stressed"].map(m => <Pressable key={m} onPress={() => setMood(m)} style={{ padding: 12, borderRadius: 12, backgroundColor: mood === m ? colors.softTeal : "#fff", borderWidth: 1, borderColor: mood === m ? colors.teal : colors.line }}><Text style={{ color: colors.ink, fontWeight: "700" }}>{m}</Text></Pressable>)}</View><Field label="Optional private journal note" value={note} onChangeText={setNote} placeholder="Anything you want to reflect on…" multiline /><Button title={saving ? "Saving…" : "Save check-in"} disabled={saving} onPress={async () => { try { setSaving(true); await apiCreateActivity("WELLBEING_CHECKIN", { mood, note }); setNote(""); await refreshActivities(); Alert.alert("Check-in saved", "Your private entry is saved to your account and is not included in general admin analytics."); } catch (error) { Alert.alert("Could not save check-in", error instanceof Error ? error.message : "Please try again."); } finally { setSaving(false); } }} /></Card>
      <Heading title="Recent check-ins" small />{records.filter(record => record.type === "WELLBEING_CHECKIN").map(record => <Card key={record.id}><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{String(record.payload.mood || "Check-in")}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(record.createdAt).toLocaleDateString()}</Text></Row>{typeof record.payload.note === "string" && record.payload.note ? <Text style={{ color: colors.muted }}>{record.payload.note}</Text> : null}</Card>)}
    </>}
    {slug === "goals" && <>
      <Card><Field label="Add a personal goal" value={goal} onChangeText={setGoal} placeholder="e.g. Revise biology for 20 minutes" /><Button title={saving ? "Saving…" : "Add goal"} disabled={saving} onPress={async () => { if (!goal.trim()) return Alert.alert("Add a goal", "Enter a short goal first."); try { setSaving(true); await app.addGoal(goal.trim()); setGoal(""); await refreshActivities(); } catch (error) { Alert.alert("Could not save goal", error instanceof Error ? error.message : "Please try again."); } finally { setSaving(false); } }} /></Card>
      {records.filter(record => record.type === "PERSONAL_GOAL").map(record => { const done = record.payload.done === true; return <Pressable key={record.id} onPress={async () => { try { await app.toggleGoal(record.id); await refreshActivities(); } catch (error) { Alert.alert("Goal not updated", error instanceof Error ? error.message : "Please try again."); } }}><Card><Row><Text style={{ fontSize: 20 }}>{done ? "☑" : "○"}</Text><Text style={{ color: colors.ink, flex: 1, fontWeight: "700", textDecorationLine: done ? "line-through" : "none" }}>{String(record.payload.title || "Personal goal")}</Text><Pill label={done ? "Done" : "In progress"} tone={done ? "green" : "blue"} /></Row></Card></Pressable>; })}
    </>}
    {slug === "notifications" && <>
      {remoteNotifications.map(n => <Pressable key={n.id} onPress={async () => { if (n.readAt) return; try { await apiMarkNotificationRead(n.id); await refreshActivities(); await app.refreshAccountData(); } catch (error) { Alert.alert("Notification not updated", error instanceof Error ? error.message : "Please try again."); } }}><Card style={{ borderColor: n.readAt ? colors.line : "#B7D7E8" }}><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, fontWeight: "800", flex: 1 }}>{n.title}</Text>{!n.readAt && <Pill label="New" tone="green" />}</Row><Text style={{ color: colors.muted, lineHeight: 20 }}>{n.body}</Text><Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>{n.readAt ? "Read" : "Tap to mark as read"}</Text></Card></Pressable>)}
      {!remoteNotifications.length && <Card><Text style={{ color: colors.muted }}>You have no notifications yet.</Text></Card>}
    </>}
    {slug === "history" && <>
      <Heading title="Your saved activities" small />
      {records.map(record => <Card key={record.id}><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{record.type.replaceAll("_", " ")}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(record.createdAt).toLocaleDateString()}</Text></Row><Text style={{ color: colors.muted }}>{record.type === "PERSONAL_GOAL" ? String(record.payload.title || "Personal goal") : record.type === "WELLBEING_CHECKIN" ? `Mood: ${String(record.payload.mood || "—")}` : `Result: ${String(record.payload.result || "Saved")}`}</Text></Card>)}
      <Heading title="Appointment history" small />
      {appointments.map(item => { const submitted = myRatings.find(rating => rating.appointmentId === item.id); return <Card key={item.id}><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{item.topic?.name || "Counselling"}</Text><Pill label={item.status.replaceAll("_", " ")} tone={item.status === "COMPLETED" ? "green" : item.status === "CANCELLED" || item.status === "NO_SHOW" ? "red" : "amber"} /></Row><Text style={{ color: colors.muted }}>{new Date(item.startsAt).toLocaleString()}</Text>{item.status === "COMPLETED" && (submitted ? <Text style={{ color: colors.primary, fontWeight: "700" }}>Rating submitted · {submitted.score}/5 · {submitted.moderationStatus.toLowerCase()}</Text> : <><View style={{ flexDirection: "row", gap: 10 }}>{[1,2,3,4,5].map(score => <Text key={score} onPress={() => setAppointmentScores(current => ({ ...current, [item.id]: score }))} style={{ fontSize: 25, color: score <= (appointmentScores[item.id] || 0) ? colors.primary : colors.mutedLight }}>★</Text>)}</View><Button title="Submit appointment rating" disabled={!appointmentScores[item.id]} onPress={async () => { try { await apiCreateRating({ appointmentId: item.id, score: appointmentScores[item.id] }); setMyRatings(await apiMyRatings()); Alert.alert("Rating submitted", "Thank you. Your feedback is pending moderation."); } catch (error) { Alert.alert("Rating not submitted", error instanceof Error ? error.message : "Please try again."); } }} /></>)}</Card>; })}
      {!records.length && !appointments.length ? <Card><Text style={{ color: colors.muted }}>Your completed activities and appointments will appear here.</Text></Card> : null}
    </>}
    {slug === "discussion" && <Card><Text style={{ color: colors.ink, fontWeight: "800" }}>Private discussions have moved to Counselling.</Text><Button title="Open counselling" onPress={() => router.push("/(student)/counselling")} /></Card>}
    {slug === "saved" && <>
      <Heading title="Saved resources" small />{app.resources.filter(r => app.savedResources.includes(r.id)).map(r => <Card key={r.id}><Pill label={r.category} /><Text style={{ color: colors.ink, fontWeight: "800" }}>{r.title}</Text><Text style={{ color: colors.muted }}>{r.description}</Text><Button title="Remove saved item" variant="ghost" onPress={() => app.toggleResource(r.id)} /></Card>)}
      <Heading title="Saved scholarships" small />{app.scholarships.filter(s => app.savedScholarships.includes(s.id)).map(s => <Card key={s.id}><Text style={{ color: colors.ink, fontWeight: "800" }}>{s.title}</Text><Text style={{ color: colors.muted }}>Deadline: {s.deadline}</Text><Button title="Remove saved item" variant="ghost" onPress={() => app.toggleScholarship(s.id)} /></Card>)}
      {!app.savedResources.length && !app.savedScholarships.length && <Card><Text style={{ color: colors.muted }}>You have not saved anything yet. Open Explore and tap Save on an item.</Text></Card>}
    </>}
    {(slug === "resources" || slug === "career" || slug === "business") && <>
      {app.resources.filter(resource => slug === "resources" || resource.category.toLowerCase().includes(slug)).map(r => <Card key={r.id}><Pill label={r.category} /><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17 }}>{r.title}</Text><Text style={{ color: colors.muted, lineHeight: 21 }}>{r.description}</Text><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted, fontSize: 12 }}>{r.readTime}</Text><Button title={app.savedResources.includes(r.id) ? "Saved ♥" : "Save ♡"} variant="secondary" onPress={() => app.toggleResource(r.id)} /></Row></Card>)}
      {!app.resources.some(resource => slug === "resources" || resource.category.toLowerCase().includes(slug)) && <Card><Text style={{ color: colors.muted }}>No resources have been published in this section yet. Check back after administrators publish relevant content.</Text></Card>}
    </>}
    {slug === "universities" && <Card>
      <Heading title="University directory" small />
      <Text style={{ color: colors.muted, lineHeight: 21 }}>A verified university directory has not been connected to this account yet. We are not displaying sample institutions or unverified admission information here.</Text>
    </Card>}
    {slug === "help" && <>
      {[
        ["Is NIN verification available?", "No. NIN verification is not connected to an authorised verification provider, and the app does not claim that your NIN has been verified."],
        ["Are scholarships verified?", "Opportunities are published by Mentorship+ administrators. Confirm eligibility and deadlines directly with the provider before applying."],
        ["Can counsellors see my journal?", "Your private wellbeing entries are tied to your account and are not included in general administrator analytics or counsellor discussion access."],
        ["Is automated AI counselling available?", "No. This build does not simulate AI conversations. You can contact a human counsellor through the counselling feature."]
      ].map(([q, a]) => <Card key={q}><Text style={{ color: colors.ink, fontWeight: "800" }}>{q}</Text><Text style={{ color: colors.muted, lineHeight: 21 }}>{a}</Text></Card>)}
    </>}
    {!["ai", "booking", "assessment", "wellness", "goals", "notifications", "history", "discussion", "saved", "resources", "career", "business", "universities", "help"].includes(slug) && <Card><Text style={{ color: colors.ink, fontWeight: "800" }}>This area is part of the Mentorship+ MVP.</Text><Text style={{ color: colors.muted }}>Use the main navigation to explore available features.</Text></Card>}
  </Screen>;
}
