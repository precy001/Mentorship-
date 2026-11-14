import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Card, Button, Pill } from "@/src/components/UI";
import { colors } from "@/src/lib/theme";
import { useApp } from "@/src/context/AppContext";
import { apiCounsellorMe, apiCounsellorSetAvailability, apiListDiscussions, apiListAppointments, apiUpdateAppointmentStatus, CounsellorSelf, DiscussionRecord, AppointmentRecord } from "@/src/lib/api";
export default function CounsellorWorkspace() {
  const app = useApp();
  const [profile, setProfile] = useState<CounsellorSelf | null>(null);
  const [discussions, setDiscussions] = useState<DiscussionRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (app.sessionLoading) return;
    if (!app.user) router.replace({ pathname: "/auth", params: { mode: "signin" } });
    else if (app.user.role === "admin" || app.user.role === "super_admin") router.replace("/(admin)");
    else if (app.user.role !== "counsellor") router.replace("/(student)");
  }, [app.sessionLoading, app.user]);
  const refresh = useCallback(async () => {
    try { const [me, inbox, sessions] = await Promise.all([apiCounsellorMe(), apiListDiscussions(), apiListAppointments()]); setProfile(me); setDiscussions(inbox); setAppointments(sessions); }
    catch (error) { Alert.alert("Counsellor workspace unavailable", error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (app.sessionLoading) return;
    if (!app.user) router.replace({ pathname: "/auth", params: { mode: "signin" } });
    else if (app.user.role !== "counsellor") router.replace("/(student)");
  }, [app.sessionLoading, app.user?.role]);
  useEffect(() => { if (app.user?.role === "counsellor") void refresh(); }, [refresh, app.user?.role]);
  const setAvailability = async (availability: "AVAILABLE" | "OFFLINE" | "ON_LEAVE") => {
    try { setSaving(true); await apiCounsellorSetAvailability(availability); await refresh(); }
    catch (error) { Alert.alert("Availability not updated", error instanceof Error ? error.message : "Please try again."); }
    finally { setSaving(false); }
  };
  const active = discussions.filter(item => !["COMPLETED", "CANCELLED"].includes(item.status));
  return <Screen>
    <Text onPress={() => Alert.alert("Sign out?", "Return to sign in?", [{ text: "Stay", style: "cancel" }, { text: "Sign out", onPress: async () => { await app.logout(); router.replace({ pathname: "/auth", params: { mode: "signin", signedOut: "1" } }); } }])} style={{ color: colors.primary, fontWeight: "800" }}>← Sign out</Text>
    <Heading title="Counsellor workspace" subtitle={`Welcome, ${app.user?.name || "Counsellor"}.`} />
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}><Text style={{ color: "#B8F2E8", fontWeight: "800" }}>YOUR WORKSPACE</Text><Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>Support within your assigned topics.</Text><Text style={{ color: "#E1EDF5" }}>Only discussions assigned to your account are shown here. Your active caseload is limited to five.</Text></Card>
    {loading ? <ActivityIndicator color={colors.primary} /> : <>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}><Card style={{ flex: 1, minWidth: "28%" }}><Text style={{ color: colors.muted, fontSize: 12 }}>Assigned topics</Text><Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>{profile?.topics.length ?? 0}</Text></Card><Card style={{ flex: 1, minWidth: "28%" }}><Text style={{ color: colors.muted, fontSize: 12 }}>Active discussions</Text><Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>{profile?.activeDiscussions ?? 0}/5</Text></Card><Card style={{ flex: 1, minWidth: "28%" }}><Text style={{ color: colors.muted, fontSize: 12 }}>Rating</Text><Text style={{ color: colors.ink, fontSize: 24, fontWeight: "900" }}>{profile?.averageRating?.toFixed(1) ?? "—"}</Text><Text style={{ color: colors.muted, fontSize: 10 }}>{profile?.ratingCount ?? 0} approved</Text></Card></View>
      <Heading title="Availability" small subtitle="Set whether the assignment system can route new discussions to you." />
      <Card><Pill label={profile?.availability || "OFFLINE"} tone={profile?.availability === "AVAILABLE" ? "green" : "amber"} /><View style={{ flexDirection: "row", gap: 8 }}><Button title="Available" onPress={() => void setAvailability("AVAILABLE")} disabled={saving || (profile?.activeDiscussions ?? 0) >= 5} /><Button title="Offline" variant="secondary" onPress={() => void setAvailability("OFFLINE")} disabled={saving} /><Button title="On leave" variant="ghost" onPress={() => void setAvailability("ON_LEAVE")} disabled={saving} /></View></Card>
      <Heading title="Your assigned topics" small />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{profile?.topics.map(topic => <Pill key={topic.id} label={topic.name} tone="blue" />)}</View>
      <Heading title="Discussion inbox" small subtitle="Open a discussion to read and reply to the member." />
      {discussions.length ? discussions.map(item => <Pressable key={item.id} onPress={() => router.push({ pathname: "/discussion/[id]", params: { id: item.id } })}><Card><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><Text style={{ color: colors.ink, fontWeight: "800", flex: 1 }}>{item.title}</Text><Pill label={item.status.replaceAll("_", " ")} tone={item.status === "COMPLETED" ? "green" : "amber"} /></View><Text style={{ color: colors.muted, fontSize: 12 }}>{item.topic.name} · {item._count?.messages ?? 0} messages</Text><Text style={{ color: colors.primary, fontWeight: "800" }}>Open conversation →</Text></Card></Pressable>) : <Card><Text style={{ color: colors.muted }}>No discussions have been assigned to you yet.</Text></Card>}
      <Heading title="Appointment requests" small subtitle="Confirm, complete or record a no-show for your assigned sessions." />
      {appointments.length ? appointments.map(item => <Card key={item.id}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><Text style={{ color: colors.ink, fontWeight: "800", flex: 1 }}>{item.member?.displayName || "Member"}</Text><Pill label={item.status.replaceAll("_", " ")} tone={item.status === "CONFIRMED" ? "green" : "amber"} /></View><Text style={{ color: colors.muted }}>{item.topic?.name || "Counselling"} · {new Date(item.startsAt).toLocaleString()}</Text>{item.status === "REQUESTED" ? <Button title="Confirm appointment" onPress={async () => { try { await apiUpdateAppointmentStatus(item.id, "CONFIRMED"); await refresh(); } catch (error) { Alert.alert("Could not confirm", error instanceof Error ? error.message : "Please try again."); } }} /> : null}{item.status === "CONFIRMED" ? <View style={{ flexDirection: "row", gap: 8 }}><Button title="Complete" onPress={async () => { try { await apiUpdateAppointmentStatus(item.id, "COMPLETED"); await refresh(); } catch (error) { Alert.alert("Could not complete", error instanceof Error ? error.message : "Please try again."); } }} /><Button title="No show" variant="secondary" onPress={async () => { try { await apiUpdateAppointmentStatus(item.id, "NO_SHOW"); await refresh(); } catch (error) { Alert.alert("Could not update", error instanceof Error ? error.message : "Please try again."); } }} /></View> : null}</Card>) : <Card><Text style={{ color: colors.muted }}>No appointment requests yet.</Text></Card>}
      <Button title="Refresh inbox" variant="secondary" onPress={() => void refresh()} />
    </>}
  </Screen>;
}
