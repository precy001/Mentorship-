import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiError, apiLogout, apiMe, apiGetPublicResources, apiGetPublicScholarships, apiListActivities, apiListNotifications, apiCreateActivity, apiUpdateActivity, apiMarkNotificationRead, apiListAppointments } from "../lib/api";

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
  avatarUrl?: string | null;
};
type Booking = { id: string; counsellor: string; date: string; time: string; startsAt: string; topic: string; status: string };
type Notice = { id: string; title: string; body: string; read: boolean; type: string };
type AppState = {
  user: User | null;
  savedResources: string[];
  savedScholarships: string[];
  bookings: Booking[];
  goals: { id: string; title: string; done: boolean }[];
  notifications: Notice[];
  resources: { id: string; title: string; category: string; readTime: string; description: string }[];
  scholarships: { id: string; title: string; provider: string; level: string; deadline: string; eligibility: string; description: string }[];
};

const STORAGE_KEY = "mentorship-plus-state-v2";
const initial: AppState = {
  user: null,
  savedResources: [],
  savedScholarships: [],
  bookings: [],
  goals: [],
  notifications: [],
  resources: [],
  scholarships: [],
};

type ContextValue = AppState & {
  sessionLoading: boolean;
  refreshAccountData: () => Promise<void>;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  toggleResource: (id: string) => void;
  toggleScholarship: (id: string) => void;
  toggleGoal: (id: string) => Promise<void>;
  addGoal: (title: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  updateAvatar: (avatarUrl: string) => void;
  updateMembership: (membership: { categoryId: string; categoryName: string; categorySlug: string; subcategoryId: string; subcategoryName: string; subcategorySlug: string }) => void;
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
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initial);
  const [loaded, setLoaded] = useState(false);
  const accountGeneration = useRef(0);

  const refreshAccountData = useCallback(async () => {
    const generation = accountGeneration.current;
    const [resources, scholarships, goals, notifications, appointments] = await Promise.allSettled([
      apiGetPublicResources(), apiGetPublicScholarships(), apiListActivities("PERSONAL_GOAL"), apiListNotifications(), apiListAppointments(),
    ]);
    if (generation !== accountGeneration.current) return;
    setState(current => ({
      ...current,
      resources: resources.status === "fulfilled" ? resources.value.map(item => ({ id: item.id, title: item.title, category: item.category, readTime: item.readTime, description: item.description })) : current.resources,
      scholarships: scholarships.status === "fulfilled" ? scholarships.value.map(item => ({ id: item.id, title: item.title, provider: item.provider, level: item.level, deadline: item.deadline.slice(0, 10), eligibility: item.eligibility, description: item.description })) : current.scholarships,
      goals: goals.status === "fulfilled" ? goals.value.map(item => ({ id: item.id, title: typeof item.payload.title === "string" ? item.payload.title : "Personal goal", done: item.payload.done === true })) : current.goals,
      notifications: notifications.status === "fulfilled" ? notifications.value.map(item => ({ id: item.id, title: item.title, body: item.body, read: Boolean(item.readAt), type: item.type })) : current.notifications,
      bookings: appointments.status === "fulfilled" ? appointments.value.map(item => ({ id: item.id, counsellor: item.counsellor.user.displayName || "Counsellor", date: new Date(item.startsAt).toLocaleDateString(), time: new Date(item.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), startsAt: item.startsAt, topic: item.topic?.name || "Counselling", status: item.status.toLowerCase() })) : current.bookings,
    }));
  }, []);

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
            // Restore only saved-item preferences; all account data comes from the API.
            resources: [], scholarships: [], notifications: [], bookings: [], goals: [],
          });
        }

        try {
          const user = await apiMe();
          if (mounted) setState(current => ({ ...current, user: toAppUser(user) }));
          if (mounted) await refreshAccountData();
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
  }, [refreshAccountData]);

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
    // A newly authenticated account starts with a clean, account-scoped client state.
    refreshAccountData,
    login: async user => {
      accountGeneration.current += 1;
      setState({ ...initial, user });
      await refreshAccountData();
    },
    // Clear the token and every account-scoped local value before leaving the private area.
    logout: async () => {
      accountGeneration.current += 1;
      try {
        await apiLogout();
      } finally {
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        setState(initial);
      }
    },
    toggleResource: id => patch(current => ({ ...current, savedResources: current.savedResources.includes(id) ? current.savedResources.filter(x => x !== id) : [...current.savedResources, id] })),
    toggleScholarship: id => patch(current => ({ ...current, savedScholarships: current.savedScholarships.includes(id) ? current.savedScholarships.filter(x => x !== id) : [...current.savedScholarships, id] })),
    toggleGoal: async id => {
      const goal = state.goals.find(item => item.id === id);
      if (!goal) return;
      const updated = await apiUpdateActivity(id, "PERSONAL_GOAL", { title: goal.title, done: !goal.done });
      patch(current => ({ ...current, goals: current.goals.map(item => item.id === id ? { ...item, done: updated.payload.done === true } : item) }));
    },
    addGoal: async title => {
      const created = await apiCreateActivity("PERSONAL_GOAL", { title: title.trim(), done: false });
      patch(current => ({ ...current, goals: [...current.goals, { id: created.id, title: title.trim(), done: false }] }));
    },
    markRead: async id => { await apiMarkNotificationRead(id); patch(current => ({ ...current, notifications: current.notifications.map(n => n.id === id ? { ...n, read: true } : n) })); },
    updateAvatar: avatarUrl => patch(current => ({ ...current, user: current.user ? { ...current.user, avatarUrl } : null })),
    updateMembership: membership => patch(current => ({ ...current, user: current.user ? { ...current.user, ...membership } : null })),

  }), [state, loaded, refreshAccountData]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
