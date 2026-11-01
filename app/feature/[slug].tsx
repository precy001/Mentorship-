import React, { useState } from "react";
import { Alert, Text, View, Pressable, TextInput, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen, Heading, Card, Button, Field, Pill, Row } from "@/src/components/UI";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/lib/theme";
import { counsellors } from "@/src/data/seed";

export default function FeatureScreen() {
  const { slug: raw } = useLocalSearchParams<{ slug: string }>(); const slug = String(raw || "resources");
  const app = useApp();
  const [text, setText] = useState(""); const [note, setNote] = useState(""); const [topic, setTopic] = useState("Career");
  const [date, setDate] = useState("2026-11-05"); const [time, setTime] = useState("10:00 AM");
  const [mood, setMood] = useState("Okay"); const [goal, setGoal] = useState("");
  const [answer, setAnswer] = useState(""); const [q, setQ] = useState(0);
  const goBack = () => router.back();
  const responseFor = (message: string) => {
    const m = message.toLowerCase();
    if (m.includes("career") || m.includes("course")) return "A useful starting point is to compare the subjects you enjoy, the skills you want to use, and the kind of problems you like solving. I can help you explore options, but your choices do not have to be final today.";
    if (m.includes("exam") || m.includes("study")) return "Try choosing one small topic, studying actively for 25 minutes, then testing yourself without looking at your notes. What subject would you like to start with?";
    if (m.includes("stress") || m.includes("sad") || m.includes("worried")) return "I’m glad you shared that. It can help to pause and name what feels hardest right now. Consider reaching out to someone you trust or a qualified human counsellor if you need more support.";
    return "Thanks for sharing that with me. Let’s break it into smaller parts. What feels like the most important thing to work through first?";
  };
  const sendAI = () => { const msg = text.trim(); if (!msg) return; app.addMessage("You", msg); setText(""); setTimeout(() => app.addMessage("AI", responseFor(msg)), 180); };
  const titleMap: Record<string, string> = { ai: "AI Counsellor", booking: "Appointments", assessment: "Career assessment", wellness: "Wellbeing check-in", goals: "Personal goals", notifications: "Notifications", discussion: "Private discussion", saved: "Saved items", resources: "Resources library", universities: "Universities", help: "Help & support" };
  const title = titleMap[slug] || "Mentorship+";
  return <Screen>
    <Pressable onPress={goBack}><Text style={{ color: colors.primary, fontWeight: "800", paddingVertical: 4 }}>← Back</Text></Pressable>
    <Heading title={title} subtitle={slug === "ai" ? "Demo responses · AI support is not a human counsellor." : undefined} />
    {slug === "ai" && <>
      <Card style={{ backgroundColor: colors.softBlue }}><Text style={{ color: colors.primary, fontWeight: "800" }}>A supportive space to think things through</Text><Text style={{ color: colors.muted, lineHeight: 20 }}>For study planning, career exploration, examination preparation, and general wellbeing. Choose human support if you need it.</Text><Button title="Talk to a human counsellor" variant="secondary" onPress={() => router.push("/(student)/counselling")} /></Card>
      <View style={{ gap: 10 }}>{app.messages.map(m => <View key={m.id} style={{ alignSelf: m.sender === "You" ? "flex-end" : "flex-start", maxWidth: "88%", padding: 13, borderRadius: 16, backgroundColor: m.sender === "You" ? colors.primary : "#fff", borderWidth: m.sender === "You" ? 0 : 1, borderColor: colors.line, gap: 5 }}><Text style={{ color: m.sender === "You" ? "#fff" : colors.ink, lineHeight: 21 }}>{m.text}</Text><Text style={{ color: m.sender === "You" ? "#D9E8F3" : colors.muted, fontSize: 10 }}>{m.sender} · {m.time}</Text></View>)}</View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}><TextInput value={text} onChangeText={setText} placeholder="Type a message…" multiline style={{ flex: 1, minHeight: 48, maxHeight: 110, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, color: colors.ink }} /><Button title="Send" onPress={sendAI} /></View>
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>If you may be in immediate danger, contact local emergency services or a trusted person. This demo is not monitored and does not provide crisis response.</Text>
    </>}
    {slug === "booking" && <>
      <Card><Heading title="Book a counselling session" small subtitle="Choose a counsellor, date and available sample time." />
        {counsellors.map(c => <Pressable key={c.id} onPress={() => setTopic(c.name)} style={{ borderWidth: 1, borderColor: topic === c.name ? colors.primary : colors.line, backgroundColor: topic === c.name ? colors.softBlue : "#fff", borderRadius: 12, padding: 12, gap: 4 }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{c.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{c.topics.join(" · ")}</Text></Pressable>)}
        <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-11-05" /><Text style={{ color: colors.ink, fontWeight: "700" }}>Sample time slot</Text><View style={{ flexDirection: "row", gap: 8 }}>{["10:00 AM", "1:00 PM", "3:30 PM"].map(t => <Pressable key={t} onPress={() => setTime(t)} style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: time === t ? colors.primary : colors.softBlue, alignItems: "center" }}><Text style={{ color: time === t ? "#fff" : colors.ink, fontWeight: "700", fontSize: 11 }}>{t}</Text></Pressable>)}</View>
        <Button title="Confirm appointment" onPress={() => { const c = counsellors.find(c => c.name === topic) || counsellors[0]; const ok = app.addBooking({ counsellor: c.name, date, time, topic: c.topics[0] }); Alert.alert(ok ? "Appointment confirmed" : "Time slot unavailable", ok ? "Your demo appointment has been saved." : "That counsellor already has a booking at this time. Choose another slot."); }} />
      </Card>
      <Heading title="Your appointments" small />
      {app.bookings.length ? app.bookings.map(b => <Card key={b.id}><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{b.counsellor}</Text><Pill label={b.status} tone={b.status === "confirmed" ? "green" : "red"} /></Row><Text style={{ color: colors.muted }}>{b.topic} · {b.date} · {b.time}</Text>{b.status === "confirmed" && <Button title="Cancel appointment" variant="ghost" onPress={() => Alert.alert("Cancel appointment?", "This demo booking will be marked cancelled.", [{ text: "Keep", style: "cancel" }, { text: "Cancel booking", style: "destructive", onPress: () => app.cancelBooking(b.id) }])} />}</Card>) : <Card><Text style={{ color: colors.muted }}>No appointments yet. Book a session above.</Text></Card>}
    </>}
    {slug === "assessment" && <>
      <Card><Pill label="DEMO CAREER TOOL" tone="purple" /><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 18 }}>{app.assessmentDone ? "Explore your career interests" : "A few questions about you"}</Text><Text style={{ color: colors.muted, lineHeight: 21 }}>Answer these sample questions to get a simple suggestion. This is not a validated psychological assessment.</Text>
      {["Which activity sounds most interesting?", "Which strength sounds most like you?", "What kind of problem would you enjoy solving?"].map((question, i) => <View key={question} style={{ gap: 8, marginTop: 8 }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{i + 1}. {question}</Text>{(i === 0 ? ["Building or fixing things", "Helping people", "Analysing information"] : i === 1 ? ["Practical problem-solving", "Listening and explaining", "Logic and patterns"] : ["Engineering challenge", "Community challenge", "Data or research challenge"]).map(opt => <Pressable key={opt} onPress={() => setAnswer(opt)} style={{ padding: 11, borderRadius: 11, backgroundColor: answer === opt ? colors.softBlue : "#fff", borderWidth: 1, borderColor: answer === opt ? colors.primary : colors.line }}><Text style={{ color: colors.ink }}>{opt}</Text></Pressable>)}</View>)}
      <Button title="Save assessment result" onPress={() => { app.markAssessment(); Alert.alert("Assessment saved", `Your current interest points toward ${answer.includes("people") || answer.includes("Listening") || answer.includes("Community") ? "people-focused paths" : answer.includes("Analysing") || answer.includes("Logic") || answer.includes("Data") ? "analytical and research paths" : "practical and technical paths"}. Explore different options with a human counsellor too.`); }} />
      {app.assessmentDone && <Pill label="Result saved on this device" tone="green" />}
      </Card>
    </>}
    {slug === "wellness" && <>
      <Card><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 18 }}>How are you feeling today?</Text><Text style={{ color: colors.muted }}>There is no right or wrong answer.</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{["Great", "Good", "Okay", "Low", "Stressed"].map(m => <Pressable key={m} onPress={() => setMood(m)} style={{ padding: 12, borderRadius: 12, backgroundColor: mood === m ? colors.softTeal : "#fff", borderWidth: 1, borderColor: mood === m ? colors.teal : colors.line }}><Text style={{ color: colors.ink, fontWeight: "700" }}>{m}</Text></Pressable>)}</View><Field label="Optional journal note (private on this device)" value={note} onChangeText={setNote} placeholder="Anything you want to reflect on…" multiline /><Button title="Save check-in" onPress={() => { app.addMood(mood, note); setNote(""); Alert.alert("Check-in saved", "Your entry has been saved locally on this device."); }} /></Card>
      <Heading title="Recent check-ins" small />{app.moods.map((m, i) => <Card key={`${m.date}-${i}`}><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, fontWeight: "800" }}>{m.mood}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{m.date}</Text></Row>{m.note ? <Text style={{ color: colors.muted }}>{m.note}</Text> : null}</Card>)}
    </>}
    {slug === "goals" && <>
      <Card><Field label="Add a personal goal" value={goal} onChangeText={setGoal} placeholder="e.g. Revise biology for 20 minutes" /><Button title="Add goal" onPress={() => { if (!goal.trim()) return Alert.alert("Add a goal", "Enter a short goal first."); app.addGoal(goal.trim()); setGoal(""); }} /></Card>
      {app.goals.map(g => <Pressable key={g.id} onPress={() => app.toggleGoal(g.id)}><Card><Row><Text style={{ fontSize: 20 }}>{g.done ? "☑" : "○"}</Text><Text style={{ color: colors.ink, flex: 1, fontWeight: "700", textDecorationLine: g.done ? "line-through" : "none" }}>{g.title}</Text><Pill label={g.done ? "Done" : "In progress"} tone={g.done ? "green" : "blue"} /></Row></Card></Pressable>)}
    </>}
    {slug === "notifications" && <>
      {app.notifications.map(n => <Pressable key={n.id} onPress={() => app.markRead(n.id)}><Card style={{ borderColor: n.read ? colors.line : "#B7D7E8" }}><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.ink, fontWeight: "800", flex: 1 }}>{n.title}</Text>{!n.read && <Pill label="New" tone="green" />}</Row><Text style={{ color: colors.muted, lineHeight: 20 }}>{n.body}</Text><Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>Tap to mark as read</Text></Card></Pressable>)}
    </>}
    {slug === "discussion" && <>
      <Card><Pill label="PRIVATE DEMO DISCUSSION" /><Text style={{ color: colors.ink, fontWeight: "800" }}>Topic: {topic}</Text><Text style={{ color: colors.muted }}>Messages are local mock data. In production, server-side access control must protect each conversation.</Text><View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{app.topics.map(t => <Pressable key={t} onPress={() => setTopic(t)}><Pill label={t} tone={topic === t ? "green" : "blue"} /></Pressable>)}</View><Field label="Write a message" value={text} onChangeText={setText} placeholder="Share what you would like support with…" multiline /><Button title="Send message" onPress={() => { if (!text.trim()) return; app.addMessage("You", text.trim()); setText(""); Alert.alert("Message saved", "This demo stores messages locally. No counsellor is notified in real time."); }} /></Card>
      {app.messages.filter(m => m.sender !== "AI").map(m => <Card key={m.id}><Text style={{ color: colors.ink }}>{m.text}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{m.sender} · {m.time}</Text></Card>)}
    </>}
    {slug === "saved" && <>
      <Heading title="Saved resources" small />{app.resources.filter(r => app.savedResources.includes(r.id)).map(r => <Card key={r.id}><Pill label={r.category} /><Text style={{ color: colors.ink, fontWeight: "800" }}>{r.title}</Text><Text style={{ color: colors.muted }}>{r.description}</Text><Button title="Remove saved item" variant="ghost" onPress={() => app.toggleResource(r.id)} /></Card>)}
      <Heading title="Saved scholarships" small />{app.scholarships.filter(s => app.savedScholarships.includes(s.id)).map(s => <Card key={s.id}><Text style={{ color: colors.ink, fontWeight: "800" }}>{s.title}</Text><Text style={{ color: colors.muted }}>Deadline: {s.deadline}</Text><Button title="Remove saved item" variant="ghost" onPress={() => app.toggleScholarship(s.id)} /></Card>)}
      {!app.savedResources.length && !app.savedScholarships.length && <Card><Text style={{ color: colors.muted }}>You have not saved anything yet. Open Explore and tap Save on an item.</Text></Card>}
    </>}
    {slug === "resources" && <>
      {app.resources.map(r => <Card key={r.id}><Pill label={r.category} /><Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17 }}>{r.title}</Text><Text style={{ color: colors.muted, lineHeight: 21 }}>{r.description}</Text><Row style={{ justifyContent: "space-between" }}><Text style={{ color: colors.muted, fontSize: 12 }}>{r.readTime}</Text><Button title={app.savedResources.includes(r.id) ? "Saved ♥" : "Save ♡"} variant="secondary" onPress={() => app.toggleResource(r.id)} /></Row></Card>)}
    </>}
    {slug === "universities" && <>
      {["University of Lagos · Akoka, Lagos", "University of Ibadan · Ibadan, Oyo", "Ahmadu Bello University · Zaria, Kaduna"].map(u => <Card key={u}><Text style={{ color: colors.ink, fontWeight: "800" }}>{u}</Text><Text style={{ color: colors.muted }}>Check the institution's official website for verified courses, requirements, fees, and application dates.</Text></Card>)}
    </>}
    {slug === "help" && <>
      {[
        ["Is the NIN verification real?", "No. The MVP uses fictional sample records on this device and does not contact a government service."],
        ["Are scholarships verified?", "No. Scholarship records are sample data to demonstrate browsing and tracking."],
        ["Can counsellors see my journal?", "Not in this demo. Journal entries are kept in local app state. A production app needs secure backend controls."],
        ["Is the AI a human counsellor?", "No. It uses predefined demo response patterns and cannot provide professional diagnosis or emergency support."]
      ].map(([q, a]) => <Card key={q}><Text style={{ color: colors.ink, fontWeight: "800" }}>{q}</Text><Text style={{ color: colors.muted, lineHeight: 21 }}>{a}</Text></Card>)}
    </>}
    {!["ai", "booking", "assessment", "wellness", "goals", "notifications", "discussion", "saved", "resources", "universities", "help"].includes(slug) && <Card><Text style={{ color: colors.ink, fontWeight: "800" }}>This area is part of the Mentorship+ MVP.</Text><Text style={{ color: colors.muted }}>Use the main navigation to explore available features.</Text></Card>}
  </Screen>;
}
