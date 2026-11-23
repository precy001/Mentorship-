import assert from "node:assert/strict";
import test from "node:test";
import { moodInsights } from "./mood.ts";

const now = new Date(2026, 10, 23, 18, 0, 0);
const at = (daysAgo: number, hour = 12) => new Date(2026, 10, 23 - daysAgo, hour).toISOString();

test("a check-in logged now appears in today's slot and this week's count", () => {
  const result = moodInsights([{ mood: "Good", createdAt: at(0) }], now);
  assert.equal(result.week.length, 7);
  assert.equal(result.week[6].isToday, true);
  assert.equal(result.week[6].mood, "Good");
  assert.equal(result.checkinsThisWeek, 1);
  assert.equal(result.streak, 1);
  assert.equal(result.commonMood, "Good");
});

test("uses the latest mood of each day and counts a streak back from today", () => {
  const result = moodInsights([
    { mood: "Low", createdAt: at(0, 9) },
    { mood: "Great", createdAt: at(0, 17) },
    { mood: "Okay", createdAt: at(1) },
    { mood: "Good", createdAt: at(2) },
    { mood: "Good", createdAt: at(5) },
  ], now);
  assert.equal(result.week[6].mood, "Great");
  assert.equal(result.streak, 3);
  assert.equal(result.checkinsThisWeek, 5);
});

test("a streak still counts when today has no check-in yet", () => {
  assert.equal(moodInsights([{ mood: "Good", createdAt: at(1) }, { mood: "Good", createdAt: at(2) }], now).streak, 2);
  assert.equal(moodInsights([{ mood: "Good", createdAt: at(3) }], now).streak, 0);
});

test("compares this week with the week before", () => {
  const brighter = moodInsights([{ mood: "Great", createdAt: at(1) }, { mood: "Low", createdAt: at(9) }], now);
  assert.equal(brighter.trend, "brighter");
  const lower = moodInsights([{ mood: "Stressed", createdAt: at(1) }, { mood: "Good", createdAt: at(9) }], now);
  assert.equal(lower.trend, "lower");
  assert.equal(moodInsights([{ mood: "Good", createdAt: at(1) }], now).trend, null);
});

test("suggests support after repeated low or stressed check-ins", () => {
  assert.equal(moodInsights([{ mood: "Stressed", createdAt: at(0) }, { mood: "Low", createdAt: at(1) }], now).needsSupport, true);
  assert.equal(moodInsights([{ mood: "Stressed", createdAt: at(0) }], now).needsSupport, true);
  assert.equal(moodInsights([{ mood: "Good", createdAt: at(0) }, { mood: "Low", createdAt: at(1) }], now).needsSupport, false);
});

test("ignores invalid dates", () => {
  const result = moodInsights([{ mood: "Good", createdAt: "not a date" }], now);
  assert.equal(result.checkinsThisWeek, 0);
  assert.equal(result.commonMood, null);
});
