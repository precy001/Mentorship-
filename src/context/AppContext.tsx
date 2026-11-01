import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialAuthorisedLgas, resources as seedResources, scholarships as seedScholarships, counsellors as seedCounsellors, topics as seedTopics } from "@/src/data/seed";

type User = { name: string; role: "student" | "counsellor" | "admin"; nin?: string; lga?: string; state?: string };
type Message = { id: string; sender: "You" | "Counsellor" | "AI"; text: string; time: string };
type Booking = { id: string; counsellor: string; date: string; time: string; topic: string; status: string };
type Notice = { id: string; title: string; body: string; read: boolean; type: string };
type AppState = {
  user: User | null; authorisedLgas: string[]; savedResources: string[]; savedScholarships: string[];
  messages: Message[]; bookings: Booking[]; moods: { mood: string; note: string; date: string }[];
  goals: { id: string; title: string; done: boolean }[]; notifications: Notice[]; assessmentDone: boolean;
  counsellors: typeof seedCounsellors; topics: string[]; resources: typeof seedResources; scholarships: typeof seedScholarships;
};
const initial: AppState = {
  user: null, authorisedLgas: initialAuthorisedLgas, savedResources: [], savedScholarships: [],
  messages: [{ id: "m1", sender: "AI", text: "Hi! I’m your Mentorship+ AI support assistant. What would you like help thinking through today?", time: "Now" }],
  bookings: [], moods: [], goals: [{ id: "g1", title: "Study for 25 minutes", done: false }, { id: "g2", title: "Take a proper break", done: false }],
  notifications: [
    { id: "n1", title: "Welcome to Mentorship+", body: "Explore resources, guidance, and support tools at your own pace.", read: false, type: "general" },
    { id: "n2", title: "Scholarship reminder", body: "Review the sample scholarship listings and their deadlines.", read: false, type: "scholarship" }
  ],
  assessmentDone: false, counsellors: seedCounsellors, topics: seedTopics, resources: seedResources, scholarships: seedScholarships
};
type ContextValue = AppState & {
  login: (user: User) => Promise<void>; logout: () => Promise<void>; toggleResource: (id: string) => void;
  toggleScholarship: (id: string) => void; addMessage: (sender: Message["sender"], text: string) => void;
  addBooking: (booking: Omit<Booking, "id" | "status">) => boolean; cancelBooking: (id: string) => void;
  addMood: (mood: string, note: string) => void; toggleGoal: (id: string) => void; addGoal: (title: string) => void;
  markRead: (id: string) => void; markAssessment: () => void; toggleLga: (lga: string) => void;
  addTopic: (topic: string) => void; addResource: (title: string, description: string) => void;
  addScholarship: (title: string, deadline: string) => void; resetDemo: () => Promise<void>;
};
const Ctx = createContext<ContextValue | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { (async () => {
    try { const saved = await AsyncStorage.getItem("guidance-plus-state-v1"); if (saved) setState({ ...initial, ...JSON.parse(saved) }); }
    catch { /* malformed local demo data falls back to seed */ } finally { setLoaded(true); }
  })(); }, []);
  useEffect(() => { if (loaded) AsyncStorage.setItem("guidance-plus-state-v1", JSON.stringify(state)).catch(() => {}); }, [state, loaded]);
  const patch = (fn: (s: AppState) => AppState) => setState(s => fn(s));
  const value = useMemo<ContextValue>(() => ({
    ...state,
    login: async user => patch(s => ({ ...s, user })),
    logout: async () => patch(s => ({ ...s, user: null })),
    toggleResource: id => patch(s => ({ ...s, savedResources: s.savedResources.includes(id) ? s.savedResources.filter(x => x !== id) : [...s.savedResources, id] })),
    toggleScholarship: id => patch(s => ({ ...s, savedScholarships: s.savedScholarships.includes(id) ? s.savedScholarships.filter(x => x !== id) : [...s.savedScholarships, id] })),
    addMessage: (sender, text) => patch(s => ({ ...s, messages: [...s.messages, { id: `${Date.now()}-${Math.random()}`, sender, text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] })),
    addBooking: booking => {
      if (state.bookings.some(b => b.counsellor === booking.counsellor && b.date === booking.date && b.time === booking.time && b.status !== "cancelled")) return false;
      patch(s => ({ ...s, bookings: [...s.bookings, { ...booking, id: String(Date.now()), status: "confirmed" }], notifications: [{ id: String(Date.now()), title: "Appointment booked", body: `${booking.counsellor} · ${booking.date} at ${booking.time}`, read: false, type: "appointment" }, ...s.notifications] }));
      return true;
    },
    cancelBooking: id => patch(s => ({ ...s, bookings: s.bookings.map(b => b.id === id ? { ...b, status: "cancelled" } : b) })),
    addMood: (mood, note) => patch(s => ({ ...s, moods: [{ mood, note, date: new Date().toLocaleDateString() }, ...s.moods] })),
    toggleGoal: id => patch(s => ({ ...s, goals: s.goals.map(g => g.id === id ? { ...g, done: !g.done } : g) })),
    addGoal: title => patch(s => ({ ...s, goals: [...s.goals, { id: String(Date.now()), title, done: false }] })),
    markRead: id => patch(s => ({ ...s, notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
    markAssessment: () => patch(s => ({ ...s, assessmentDone: true })),
    toggleLga: lga => patch(s => ({ ...s, authorisedLgas: s.authorisedLgas.includes(lga) ? s.authorisedLgas.filter(x => x !== lga) : [...s.authorisedLgas, lga] })),
    addTopic: topic => patch(s => ({ ...s, topics: s.topics.includes(topic) ? s.topics : [...s.topics, topic] })),
    addResource: (title, description) => patch(s => ({ ...s, resources: [{ id: String(Date.now()), title, category: "Added by admin", readTime: "New", description }, ...s.resources] })),
    addScholarship: (title, deadline) => patch(s => ({ ...s, scholarships: [{ id: String(Date.now()), title, provider: "Admin demo entry", level: "All levels", deadline, eligibility: "Confirm eligibility with the provider.", description: "Admin-created mock listing." }, ...s.scholarships] })),
    resetDemo: async () => { await AsyncStorage.removeItem("guidance-plus-state-v1"); setState(initial); }
  }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useApp() { const ctx = useContext(Ctx); if (!ctx) throw new Error("useApp must be used within AppProvider"); return ctx; }
