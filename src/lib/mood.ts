/**
 * Wellbeing insights, worked out on the device from the member's own private check-ins.
 * Pure functions (no React) so they can be unit-tested.
 */
export type MoodEntry = { mood: string; createdAt: string };

export const MOOD_ORDER = ["Great", "Good", "Okay", "Low", "Stressed"] as const;
/** Higher is brighter. Used for the week-on-week comparison only. */
const MOOD_SCORE: Record<string, number> = { Great: 5, Good: 4, Okay: 3, Low: 2, Stressed: 1 };
const DAY_MS = 86_400_000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export type DaySlot = { key: string; label: string; isToday: boolean; mood: string | null };
export type MoodInsights = {
  /** Last 7 days, oldest first, with the latest mood logged on each day (or null). */
  week: DaySlot[];
  checkinsThisWeek: number;
  /** Most frequent mood over the last 30 days (ties go to the brighter mood). */
  commonMood: string | null;
  /** Consecutive days with a check-in, counting back from today (or from yesterday if today is still empty). */
  streak: number;
  /** Average this week compared with the 7 days before; null when either week has no check-ins. */
  trend: "brighter" | "steady" | "lower" | null;
  /** True when the latest check-ins suggest the member may be having a hard time. */
  needsSupport: boolean;
};

export function moodInsights(entries: MoodEntry[], now: Date = new Date()): MoodInsights {
  const today = startOfDay(now);
  const valid = entries
    .map((entry) => ({ mood: entry.mood, at: new Date(entry.createdAt) }))
    .filter((entry) => Number.isFinite(entry.at.getTime()) && entry.at.getTime() <= now.getTime() + 60_000)
    .sort((a, b) => b.at.getTime() - a.at.getTime());

  const latestByDay = new Map<string, string>();
  for (const entry of valid) if (!latestByDay.has(dayKey(entry.at))) latestByDay.set(dayKey(entry.at), entry.mood);

  const week: DaySlot[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(today.getTime() - offset * DAY_MS);
    week.push({ key: dayKey(day), label: day.toLocaleDateString(undefined, { weekday: "narrow" }), isToday: offset === 0, mood: latestByDay.get(dayKey(day)) ?? null });
  }

  const weekStart = today.getTime() - 6 * DAY_MS;
  const thisWeek = valid.filter((entry) => entry.at.getTime() >= weekStart);
  const lastWeek = valid.filter((entry) => entry.at.getTime() >= weekStart - 7 * DAY_MS && entry.at.getTime() < weekStart);

  const counts = new Map<string, number>();
  for (const entry of valid.filter((item) => item.at.getTime() >= today.getTime() - 29 * DAY_MS)) counts.set(entry.mood, (counts.get(entry.mood) ?? 0) + 1);
  let commonMood: string | null = null;
  for (const [mood, count] of counts) {
    const best = commonMood ? counts.get(commonMood) ?? 0 : -1;
    if (count > best || (count === best && (MOOD_SCORE[mood] ?? 0) > (MOOD_SCORE[commonMood ?? ""] ?? 0))) commonMood = mood;
  }

  let streak = 0;
  let cursor = latestByDay.has(dayKey(today)) ? today : new Date(today.getTime() - DAY_MS);
  while (latestByDay.has(dayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  const average = (list: { mood: string }[]) => list.reduce((sum, entry) => sum + (MOOD_SCORE[entry.mood] ?? 3), 0) / list.length;
  let trend: MoodInsights["trend"] = null;
  if (thisWeek.length && lastWeek.length) {
    const difference = average(thisWeek) - average(lastWeek);
    trend = difference >= 0.5 ? "brighter" : difference <= -0.5 ? "lower" : "steady";
  }

  const recent = valid.slice(0, 3);
  const needsSupport = recent.length > 0 && (recent[0].mood === "Stressed" || recent[0].mood === "Low") && recent.filter((entry) => entry.mood === "Low" || entry.mood === "Stressed").length >= Math.min(2, recent.length);

  return { week, checkinsThisWeek: thisWeek.length, commonMood, streak, trend, needsSupport };
}
