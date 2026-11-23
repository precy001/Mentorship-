import { useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiError, apiNewsFeed, type NewsPost } from "./api";
import { appendPage, newestPublishedAt, unseenCount } from "./newsFeed";

/**
 * One shared copy of the News & updates feed for every screen that shows it (member home, counsellor workspace,
 * the News screen), so they agree and the feed is fetched once rather than per screen. Kept out of AppContext on
 * purpose: it has its own lifecycle (pages, freshness, "seen" marker) and nothing else depends on it.
 *
 * - Fresh for a minute: screens can ask for it freely; a pull-to-refresh forces a reload.
 * - "New" markers: the newest date this person has seen is kept on this phone (per account).
 * - An older server without the feed (404) is treated as "no news yet", so the app works before the API update.
 */

export type NewsState = {
  userId: string | null;
  items: NewsPost[];
  nextCursor: string | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  loadingMore: boolean;
  lastSeenAt: string | null;
  fetchedAt: number;
};

const PAGE_SIZE = 20;
const FRESH_MS = 60_000;
const seenKey = (userId: string) => `mentorship.newsSeen.${userId}`;
const blank = (userId: string | null): NewsState => ({ userId, items: [], nextCursor: null, status: "idle", error: null, loadingMore: false, lastSeenAt: null, fetchedAt: 0 });

let state: NewsState = blank(null);
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;

function update(patch: Partial<NewsState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

/** Switches the store to this account (a different person signing in starts clean). */
function bindUser(userId: string) {
  if (state.userId === userId) return;
  state = blank(userId);
  inFlight = null;
  listeners.forEach((listener) => listener());
  AsyncStorage.getItem(seenKey(userId))
    .then((seen) => { if (seen && state.userId === userId) update({ lastSeenAt: seen }); })
    .catch(() => {});
}

const failure = (error: unknown) => (error instanceof Error && error.message ? error.message : "News could not be loaded.");

export function refreshNews(userId: string, options: { force?: boolean } = {}): Promise<void> {
  bindUser(userId);
  if (!options.force && state.status === "ready" && Date.now() - state.fetchedAt < FRESH_MS) return Promise.resolve();
  if (inFlight) return inFlight;
  if (!state.items.length) update({ status: "loading", error: null });
  inFlight = (async () => {
    try {
      const page = await apiNewsFeed({ limit: PAGE_SIZE });
      if (state.userId !== userId) return;
      update({ items: page.items, nextCursor: page.nextCursor, status: "ready", error: null, fetchedAt: Date.now() });
    } catch (error) {
      if (state.userId !== userId) return;
      if (error instanceof ApiError && error.status === 404) update({ items: [], nextCursor: null, status: "ready", error: null, fetchedAt: Date.now() });
      else update({ status: state.items.length ? "ready" : "error", error: failure(error) });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export async function loadMoreNews(): Promise<void> {
  const { userId, nextCursor, loadingMore } = state;
  if (!userId || !nextCursor || loadingMore) return;
  update({ loadingMore: true });
  try {
    const page = await apiNewsFeed({ limit: PAGE_SIZE, cursor: nextCursor });
    if (state.userId !== userId) return;
    update({ items: appendPage(state.items, page.items), nextCursor: page.nextCursor, loadingMore: false });
  } catch (error) {
    if (state.userId === userId) update({ loadingMore: false, error: failure(error) });
  }
}

/** Everything currently loaded counts as seen (called when the News screen is opened). */
export function markNewsSeen(): void {
  const newest = newestPublishedAt(state.items);
  const { userId, lastSeenAt } = state;
  if (!userId || !newest || (lastSeenAt && new Date(lastSeenAt).getTime() >= new Date(newest).getTime())) return;
  update({ lastSeenAt: newest });
  AsyncStorage.setItem(seenKey(userId), newest).catch(() => {});
}

/** Marks the feed stale (after an administrator changes a post) so the next screen that shows it reloads it. */
export function invalidateNews(): void {
  if (state.userId) update({ fetchedAt: 0 });
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => state;

/** The shared feed for the signed-in person; loads it (if not fresh) when a screen using it appears. */
export function useNews(userId: string | undefined): NewsState & { unseen: number } {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => { if (userId) void refreshNews(userId); }, [userId]);
  const mine = userId && current.userId === userId ? current : blank(userId ?? null);
  return { ...mine, unseen: unseenCount(mine.items, mine.lastSeenAt) };
}
