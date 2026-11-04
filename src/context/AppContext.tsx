import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiError, apiLogout, apiMe } from "../lib/api";

type AppRole = "member" | "student" | "counsellor" | "admin" | "super_admin";
type User = {
  id?: string;
  email?: string;
  name: string;
  role: AppRole;
  nin?: string;
  lga?: string;
  state?: string;
  categoryId?: string;
  categoryName?: string;
  categorySlug?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  subcategorySlug?: string;
};
type Message = { id: string; sender: "You" | "Counsellor" | "AI"; text: string; time: string };
type Booking = { id: string; counsellor: string; date: string; time: string; topic: string; status: string };
type Notice = { id: string; title: string; body: string; read: boolean; type: string };
type AppState = {
  user: User | null;
  authorisedLgas: string[];
  savedResources: string[];
  savedScholarships: string[];
  messages: Message[];
  bookings: Booking[];
  moods: { mood: string; note: string; date: string }[];
  goals: { id: string; title: string; done: boolean }[];
  notifications: Notice[];
  assessmentDone: boolean;
  counsellors: { id: string; name: string; topics: string[]; bio: string; availability: string }[];
  topics: string[];
  resources: { id: string; title: string; category: string; readTime: string; description: string }[];
  scholarships: { id: string; title: string; provider: string; level: string; deadline: string; eligibility: string; description: string }[];
};

const STORAGE_KEY = "mentorship-plus-state-v2";
const initial: AppState = {
  user: null,
  authorisedLgas: [],
  savedResources: [],
  savedScholarships: [],
  messages: [],
  bookings: [],
  moods: [],
  goals: [],
  notifications: [],
  assessmentDone: false,
  counsellors: [],
  topics: [],
  resources: [],
  scholarships: [],
};

type ContextValue = AppState & {
  sessionLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  toggleResource: (id: string) => void;
  toggleScholarship: (id: string) => void;
  addMessage: (sender: Message["sender"], text: string) => void;
  addBooking: (booking: Omit<Booking, "id" | "status">) => boolean;
  cancelBooking: (id: string) => void;
  addMood: (mood: string, note: string) => void;
  toggleGoal: (id: string) => void;
  addGoal: (title: string) => void;
  markRead: (id: string) => void;
  markAssessment: () => void;
  toggleLga: (lga: string) => void;
  addTopic: (topic: string) => void;
  addResource: (title: string, description: string) => void;
  addScholarship: (title: string, deadline: string) => void;
  resetDemo: () => Promise<void>;
};

const Ctx = createContext<ContextValue | null>(null);

function toAppUser(user: Awaited<ReturnType<typeof apiMe>>): User {
  const role: AppRole = user.role === "COUNSELLOR"
    ? "counsellor"
    : user.role === "ADMIN"
      ? "admin"
      : user.role === "SUPER_ADMIN"
        ? "super_admin"
        : "member";
  return {
    id: user.id,
    email: user.email,
    name: user.displayName?.trim() || user.email.split("@")[0],
    role,
    categoryId: user.profile?.category?.id,
    categoryName: user.profile?.category?.name,
    categorySlug: user.profile?.category?.slug,
    subcategoryId: user.profile?.subcategory?.id,
    subcategoryName: user.profile?.subcategory?.name,
    subcategorySlug: user.profile?.subcategory?.slug,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initial);
  const [loaded, setLoaded] = useState(false);

  // Restore non-auth preferences locally, but always validate the session with the API.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && mounted) {
          const parsed = JSON.parse(saved) as Partial<AppState>;
          setState({
            ...initial,
            ...parsed,
            user: null,
            // Do not restore old demo collections from local storage.
            counsellors: [], topics: [], resources: [], scholarships: [],
            notifications: [], messages: [], bookings: [], goals: [],
          });
        }

        try {
          const user = await apiMe();
          if (mounted) setState(current => ({ ...current, user: toAppUser(user) }));
        } catch (error) {
          // A revoked/expired token should not be retried on every launch.
          if (error instanceof ApiError && error.status === 401) await apiLogout();
          // Network errors do not delete the token; the user can retry when online.
        }
      } catch {
        // Invalid local preference data is ignored.
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Never persist the authenticated user here. The API token + /auth/me are the source of truth.
  useEffect(() => {
    if (!loaded) return;
    const { user: _user, ...persistable } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable)).catch(() => {});
  }, [state, loaded]);

  const patch = (fn: (current: AppState) => AppState) => setState(current => fn(current));

  const value = useMemo<ContextValue>(() => ({
    ...state,
    sessionLoading: !loaded,
    login: async user => patch(current => ({ ...current, user })),
    logout: async () => {
      await apiLogout();
      patch(current => ({ ...current, user: null }));
    },
    toggleResource: id => patch(current => ({ ...current, savedResources: current.savedResources.includes(id) ? current.savedResources.filter(x => x !== id) : [...current.savedResources, id] })),
    toggleScholarship: id => patch(current => ({ ...current, savedScholarships: current.savedScholarships.includes(id) ? current.savedScholarships.filter(x => x !== id) : [...current.savedScholarships, id] })),
    addMessage: (sender, text) => patch(current => ({ ...current, messages: [...current.messages, { id: `${Date.now()}-${Math.random()}`, sender, text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] })),
    addBooking: booking => {
      if (state.bookings.some(b => b.counsellor === booking.counsellor && b.date === booking.date && b.time === booking.time && b.status !== "cancelled")) return false;
      patch(current => ({ ...current, bookings: [...current.bookings, { ...booking, id: String(Date.now()), status: "confirmed" }] }));
      return true;
    },
    cancelBooking: id => patch(current => ({ ...current, bookings: current.bookings.map(b => b.id === id ? { ...b, status: "cancelled" } : b) })),
    addMood: (mood, note) => patch(current => ({ ...current, moods: [{ mood, note, date: new Date().toLocaleDateString() }, ...current.moods] })),
    toggleGoal: id => patch(current => ({ ...current, goals: current.goals.map(g => g.id === id ? { ...g, done: !g.done } : g) })),
    addGoal: title => patch(current => ({ ...current, goals: [...current.goals, { id: String(Date.now()), title, done: false }] })),
    markRead: id => patch(current => ({ ...current, notifications: current.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
    markAssessment: () => patch(current => ({ ...current, assessmentDone: true })),
    toggleLga: lga => patch(current => ({ ...current, authorisedLgas: current.authorisedLgas.includes(lga) ? current.authorisedLgas.filter(x => x !== lga) : [...current.authorisedLgas, lga] })),
    addTopic: topic => patch(current => ({ ...current, topics: current.topics.includes(topic) ? current.topics : [...current.topics, topic] })),
    addResource: (title, description) => patch(current => ({ ...current, resources: [{ id: String(Date.now()), title, category: "Added by admin", readTime: "New", description }, ...current.resources] })),
    addScholarship: (title, deadline) => patch(current => ({ ...current, scholarships: [{ id: String(Date.now()), title, provider: "", level: "All levels", deadline, eligibility: "", description: "" }, ...current.scholarships] })),
    resetDemo: async () => {
      await apiLogout();
      await AsyncStorage.removeItem(STORAGE_KEY);
      setState(initial);
    },
  }), [state, loaded]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
