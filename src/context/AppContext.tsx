import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as NativeAppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isForMember } from "../lib/audience";
import { ApiError, apiLogout, apiMe, apiGetPublicResources, apiGetPublicScholarships, apiGetPublicGrants, apiListActivities, apiNotificationPage, apiNotificationUnreadCount, apiMarkAllNotificationsRead, apiReadNotification, apiMarkWelcomeSeen, apiCreateActivity, apiUpdateActivity, apiListAppointments, apiMarkDiscussionsDelivered, type ApiUser } from "../lib/api";

type AppRole = "member" | "student" | "counsellor" | "admin" | "super_admin";
type User = {
  id?: string;
  email?: string;
  name: string;
  role: AppRole;
  /** National Identification Number. Required for members; collected, not verified. */
  nin?: string;
  lga?: string;
  lcda?: string;
  state?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  school?: string;
  /** Null until the first-time welcome has been dismissed. */
  welcomeSeenAt?: string | null;
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
type AudienceFields = { audienceCategories?: string[]; audienceSubcategories?: string[] };
/** A private wellbeing check-in (mood + optional journal note). */
export type Checkin = { id: string; mood: string; note: string; createdAt: string };
export type GrantSummary = { id: string; title: string; provider: string; amount: string | null; deadline: string | null; eligibility: string; description: string; imageUrl: string | null; applyUrl: string | null } & AudienceFields;
type AppState = {
  user: User | null;
  savedResources: string[];
  savedScholarships: string[];
  savedGrants: string[];
  bookings: Booking[];
  goals: { id: string; title: string; done: boolean }[];
  notifications: Notice[];
  /** Server-side unread total, accurate even when more than one page of history exists. */
  unreadCount: number;
  resources: ({ id: string; title: string; category: string; readTime: string; description: string; imageUrl: string | null } & AudienceFields)[];
  scholarships: ({ id: string; title: string; provider: string; level: string; deadline: string; eligibility: string; description: string; imageUrl: string | null; applyUrl: string | null } & AudienceFields)[];
  grants: GrantSummary[];
  /** Newest first. Kept here so every screen (wellbeing, profile, home) updates the moment a check-in is saved. */
  checkins: Checkin[];
};

const STORAGE_KEY = "mentorship-plus-state-v2";
const initial: AppState = {
  user: null,
  savedResources: [],
  savedScholarships: [],
  savedGrants: [],
  bookings: [],
  goals: [],
  notifications: [],
  unreadCount: 0,
  resources: [],
  scholarships: [],
  grants: [],
  checkins: [],
};

type ContextValue = AppState & {
  sessionLoading: boolean;
  refreshAccountData: () => Promise<void>;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  toggleResource: (id: string) => void;
  toggleScholarship: (id: string) => void;
  toggleGrant: (id: string) => void;
  /** Saves a wellbeing check-in to the account and shows it everywhere straight away. */
  addCheckin: (mood: string, note: string) => Promise<Checkin>;
  toggleGoal: (id: string) => Promise<void>;
  addGoal: (title: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  dismissWelcome: () => Promise<void>;
  applyAccount: (user: ApiUser) => void;
  updateAvatar: (avatarUrl: string) => void;
  updateMembership: (membership: { categoryId: string; categoryName: string; categorySlug: string; subcategoryId: string; subcategoryName: string; subcategorySlug: string }) => void;
};

const Ctx = createContext<ContextValue | null>(null);

export function toAppUser(user: Awaited<ReturnType<typeof apiMe>>): User {
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
    lga: user.profile?.lga ?? undefined,
    lcda: user.profile?.lcda ?? undefined,
    state: user.profile?.stateOfResidence ?? undefined,
    phoneNumber: user.profile?.phoneNumber ?? undefined,
    dateOfBirth: user.profile?.dateOfBirth ? String(user.profile.dateOfBirth).slice(0, 10) : undefined,
    school: user.profile?.school ?? undefined,
    nin: user.profile?.nin ?? undefined,
    welcomeSeenAt: user.welcomeSeenAt ?? null,
  };
}

function toCheckins(items: { id: string; payload: Record<string, unknown>; createdAt: string }[]): Checkin[] {
  return items
    .map(item => ({ id: item.id, mood: typeof item.payload.mood === "string" ? item.payload.mood : "Check-in", note: typeof item.payload.note === "string" ? item.payload.note : "", createdAt: item.createdAt }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function toNotices(items: { id: string; title: string; body: string; type: string; readAt: string | null }[]): Notice[] {
  return items.map(item => ({ id: item.id, title: item.title, body: item.body, read: Boolean(item.readAt), type: item.type }));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initial);
  const [loaded, setLoaded] = useState(false);
  const accountGeneration = useRef(0);

  const refreshAccountData = useCallback(async () => {
    const generation = accountGeneration.current;
    const [resources, scholarships, goals, notifications, unread, appointments, grants, checkins] = await Promise.allSettled([
      apiGetPublicResources(), apiGetPublicScholarships(), apiListActivities("PERSONAL_GOAL"), apiNotificationPage({ limit: 50 }), apiNotificationUnreadCount(), apiListAppointments(),
      apiGetPublicGrants(), apiListActivities("WELLBEING_CHECKIN"),
    ]);
    if (generation !== accountGeneration.current) return;
    const audience = (item: AudienceFields) => ({ audienceCategories: item.audienceCategories ?? [], audienceSubcategories: item.audienceSubcategories ?? [] });
    setState(current => ({
      ...current,
      resources: resources.status === "fulfilled" ? resources.value.map(item => ({ id: item.id, title: item.title, category: item.category, readTime: item.readTime, description: item.description, imageUrl: item.imageUrl ?? null, ...audience(item) })) : current.resources,
      scholarships: scholarships.status === "fulfilled" ? scholarships.value.map(item => ({ id: item.id, title: item.title, provider: item.provider, level: item.level, deadline: item.deadline, eligibility: item.eligibility, description: item.description, imageUrl: item.imageUrl ?? null, applyUrl: item.applyUrl ?? null, ...audience(item) })) : current.scholarships,
      grants: grants.status === "fulfilled" ? grants.value.map(item => ({ id: item.id, title: item.title, provider: item.provider, amount: item.amount ?? null, deadline: item.deadline ?? null, eligibility: item.eligibility, description: item.description, imageUrl: item.imageUrl ?? null, applyUrl: item.applyUrl ?? null, ...audience(item) })) : current.grants,
      checkins: checkins.status === "fulfilled" ? toCheckins(checkins.value) : current.checkins,
      goals: goals.status === "fulfilled" ? goals.value.map(item => ({ id: item.id, title: typeof item.payload.title === "string" ? item.payload.title : "Personal goal", done: item.payload.done === true })) : current.goals,
      notifications: notifications.status === "fulfilled" ? toNotices(notifications.value.items) : current.notifications,
      unreadCount: unread.status === "fulfilled" ? unread.value.unread : current.unreadCount,
      bookings: appointments.status === "fulfilled" ? appointments.value.map(item => ({ id: item.id, counsellor: item.counsellor.user.displayName || "Mentor", date: new Date(item.startsAt).toLocaleDateString(), time: new Date(item.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), startsAt: item.startsAt, topic: item.topic?.name || "Counselling", status: item.status.toLowerCase() })) : current.bookings,
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
            resources: [], scholarships: [], grants: [], checkins: [], notifications: [], bookings: [], goals: [],
            savedGrants: Array.isArray(parsed.savedGrants) ? parsed.savedGrants : [],
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
    // Private journal check-ins are never written to device storage; they are always reloaded from the account.
    const { user: _user, checkins: _checkins, ...persistable } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable)).catch(() => {});
  }, [state, loaded]);

  const userId = state.user?.id;
  const refreshNotifications = useCallback(async () => {
    const generation = accountGeneration.current;
    const [page, unread] = await Promise.allSettled([apiNotificationPage({ limit: 50 }), apiNotificationUnreadCount()]);
    if (generation !== accountGeneration.current) return;
    setState(current => ({
      ...current,
      notifications: page.status === "fulfilled" ? toNotices(page.value.items) : current.notifications,
      unreadCount: unread.status === "fulfilled" ? unread.value.unread : current.unreadCount,
    }));
  }, []);

  // When the app returns to the foreground, reload the account (at most once a minute) so changes made elsewhere
  // apply without signing out and in, e.g. an administrator approving this person as a counsellor.
  const lastAccountCheck = useRef(0);
  const refreshAccount = useCallback(async () => {
    if (Date.now() - lastAccountCheck.current < 60_000) return;
    lastAccountCheck.current = Date.now();
    const generation = accountGeneration.current;
    try {
      const fresh = toAppUser(await apiMe());
      if (generation !== accountGeneration.current) return;
      setState(current => (current.user && current.user.id === fresh.id ? { ...current, user: fresh } : current));
    } catch { /* offline or signed out elsewhere: keep the current session as it is */ }
  }, []);

  // Message receipts: whenever the app checks in, discussion messages have reached this phone, so the server marks
  // them "delivered" (two grey ticks for the sender). Administrators oversee conversations and are never the
  // recipient. One request per check-in, and it writes nothing when nothing is waiting.
  const userRole = state.user?.role;
  const receiptsSupported = useRef(true);
  const acknowledgeDelivery = useCallback(() => {
    if (!userRole || userRole === "admin" || userRole === "super_admin" || !receiptsSupported.current) return;
    apiMarkDiscussionsDelivered().catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) receiptsSupported.current = false; // older server
    });
  }, [userRole]);

  // In-app delivery: check for new notifications while the app is open and whenever it returns to the foreground.
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const checkIn = () => { void refreshNotifications(); acknowledgeDelivery(); };
    const start = () => { if (!timer) timer = setInterval(checkIn, 45_000); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    if (NativeAppState.currentState === "active") { acknowledgeDelivery(); start(); }
    const subscription = NativeAppState.addEventListener("change", status => {
      if (status === "active") { checkIn(); void refreshAccount(); start(); } else stop();
    });
    return () => { stop(); subscription.remove(); };
  }, [userId, refreshNotifications, refreshAccount, acknowledgeDelivery]);

  const patch = (fn: (current: AppState) => AppState) => setState(current => fn(current));

  const value = useMemo<ContextValue>(() => ({
    ...state,
    // Members only see content meant for them ("Who is this for?" set by administrators).
    resources: state.resources.filter(item => isForMember(item, state.user)),
    scholarships: state.scholarships.filter(item => isForMember(item, state.user)),
    grants: state.grants.filter(item => isForMember(item, state.user)),
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
    toggleGrant: id => patch(current => ({ ...current, savedGrants: current.savedGrants.includes(id) ? current.savedGrants.filter(x => x !== id) : [...current.savedGrants, id] })),
    addCheckin: async (mood, note) => {
      const created = await apiCreateActivity("WELLBEING_CHECKIN", { mood, note });
      const checkin: Checkin = { id: created.id, mood, note, createdAt: created.createdAt || new Date().toISOString() };
      patch(current => ({ ...current, checkins: [checkin, ...current.checkins.filter(item => item.id !== checkin.id)] }));
      return checkin;
    },
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
    markRead: async id => {
      await apiReadNotification(id);
      patch(current => {
        const wasUnread = current.notifications.some(n => n.id === id && !n.read);
        return { ...current, unreadCount: Math.max(0, current.unreadCount - (wasUnread ? 1 : 0)), notifications: current.notifications.map(n => n.id === id ? { ...n, read: true } : n) };
      });
    },
    markAllRead: async () => {
      await apiMarkAllNotificationsRead();
      patch(current => ({ ...current, unreadCount: 0, notifications: current.notifications.map(n => ({ ...n, read: true })) }));
    },
    refreshNotifications,
    dismissWelcome: async () => {
      // Hide it immediately; the server stamp makes sure it is never shown again on any device.
      patch(current => ({ ...current, user: current.user ? { ...current.user, welcomeSeenAt: current.user.welcomeSeenAt ?? new Date().toISOString() } : null }));
      try { await apiMarkWelcomeSeen(); } catch { /* the welcome may appear once more next time if this failed */ }
    },
    applyAccount: account => patch(current => ({ ...current, user: toAppUser(account) })),
    updateAvatar: avatarUrl => patch(current => ({ ...current, user: current.user ? { ...current.user, avatarUrl } : null })),
    updateMembership: membership => patch(current => ({ ...current, user: current.user ? { ...current.user, ...membership } : null })),

  }), [state, loaded, refreshAccountData, refreshNotifications]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
