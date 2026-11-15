/**
 * Presentation helpers shared by every dashboard. Pure functions only (no React imports),
 * so they are safe to use from any screen and trivial to test.
 */

export type Tone = "blue" | "green" | "amber" | "red" | "purple" | "neutral";

const dateOnly: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
const timeOnly: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

function valid(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Mon, 16 Nov" */
export function formatShortDate(value: string | number | Date | null | undefined): string {
  const date = valid(value);
  return date ? date.toLocaleDateString("en-GB", dateOnly) : "Date unavailable";
}

/** "10:00 am" */
export function formatTime(value: string | number | Date | null | undefined): string {
  const date = valid(value);
  return date ? date.toLocaleTimeString("en-GB", timeOnly) : "";
}

/** "Mon, 16 Nov · 10:00 am" */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const date = valid(value);
  if (!date) return "Date unavailable";
  return `${formatShortDate(date)} · ${formatTime(date)}`;
}

/** "Mon, 16 Nov · 10:00 am – 10:45 am" */
export function formatTimeRange(start: string, end: string): string {
  const s = valid(start);
  const e = valid(end);
  if (!s) return "Date unavailable";
  return e ? `${formatShortDate(s)} · ${formatTime(s)} – ${formatTime(e)}` : formatDateTime(s);
}

/** "IN_PROGRESS" -> "In progress" */
export function humanize(value: string | null | undefined): string {
  if (!value) return "";
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function initialOf(name: string | null | undefined, fallback = "M"): string {
  return (name || fallback).trim().charAt(0).toUpperCase() || fallback;
}

/** Colour for a counselling-discussion status pill. Completed is neutral, not an error. */
export function discussionTone(status: string): Tone {
  switch (status) {
    case "OPEN":
    case "REASSIGNMENT_REQUIRED":
      return "amber";
    case "ASSIGNED":
    case "IN_PROGRESS":
      return "green";
    case "WAITING_FOR_MEMBER":
      return "purple";
    case "COMPLETED":
      return "blue";
    case "CANCELLED":
      return "red";
    default:
      return "neutral";
  }
}

export function discussionIsClosed(status: string): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}

/** Colour for an appointment status pill. */
export function appointmentTone(status: string): Tone {
  switch (status) {
    case "CONFIRMED":
      return "green";
    case "COMPLETED":
      return "blue";
    case "CANCELLED":
    case "NO_SHOW":
      return "red";
    default:
      return "amber";
  }
}

export function availabilityTone(status: string | null | undefined): Tone {
  if (status === "AVAILABLE") return "green";
  if (status === "BUSY") return "amber";
  if (status === "SUSPENDED") return "red";
  return "neutral";
}
