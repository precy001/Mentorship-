/**
 * Pure form-validation helpers (no React Native imports, so they are unit-testable with
 * `node --test src/lib/validation.test.ts`). Every validator returns an error message,
 * or `null` when the value is valid.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateRequired(value: string, label: string): string | null {
  return value.trim() ? null : `${label} is required.`;
}

export function validateLength(
  value: string,
  label: string,
  limits: { min?: number; max?: number; required?: boolean },
): string | null {
  const text = value.trim();
  if (!text) return limits.required === false ? null : `${label} is required.`;
  if (limits.min !== undefined && text.length < limits.min) return `${label} must be at least ${limits.min} characters.`;
  if (limits.max !== undefined && text.length > limits.max) return `${label} must be ${limits.max} characters or fewer.`;
  return null;
}

export function validateChoice(value: string, label: string): string | null {
  return value ? null : `Select a ${label.toLowerCase()}.`;
}

export function validateEmail(value: string, options: { required?: boolean } = {}): string | null {
  const email = value.trim();
  if (!email) return options.required === false ? null : "Email address is required.";
  if (email.length > 320 || !EMAIL_PATTERN.test(email)) return "Enter a valid email address, for example name@example.com.";
  return null;
}

/** Removes spaces, dashes and brackets that people type into phone numbers. */
export function normalizePhone(value: string): string {
  return value.replace(/[\s\-().]/g, "");
}

/** Accepts international (+2348012345678) and Nigerian local (08012345678) numbers. */
export function validatePhone(value: string, options: { required?: boolean } = {}): string | null {
  const phone = normalizePhone(value);
  if (!phone) return options.required === false ? null : "Phone number is required.";
  if (/^\+[1-9]\d{9,14}$/.test(phone) || /^0\d{10}$/.test(phone)) return null;
  return "Enter a valid phone number, for example +2348012345678 or 08012345678.";
}

/** Keeps digits only, for numeric inputs that must reject letters and symbols as they are typed. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function validateInteger(
  value: string,
  label: string,
  limits: { min?: number; max?: number; required?: boolean },
): string | null {
  const text = value.trim();
  if (!text) return limits.required === false ? null : `${label} is required.`;
  if (!/^\d+$/.test(text)) return `${label} must be a whole number.`;
  const number = Number(text);
  if (limits.min !== undefined && number < limits.min) return `${label} must be at least ${limits.min}.`;
  if (limits.max !== undefined && number > limits.max) return `${label} must be ${limits.max} or less.`;
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD. */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateString(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function validateDateString(
  value: string,
  label: string,
  limits: { min?: string; max?: string; required?: boolean } = {},
): string | null {
  if (!value) return limits.required === false ? null : `Choose a ${label.toLowerCase()}.`;
  if (!parseDateString(value)) return `${label} is not a valid date.`;
  if (limits.min && value < limits.min) return `${label} cannot be before ${formatDisplayDate(limits.min)}.`;
  if (limits.max && value > limits.max) return `${label} cannot be after ${formatDisplayDate(limits.max)}.`;
  return null;
}

/** A calendar day, interpreted as ending at 23:59:59 local time, as an ISO timestamp. */
export function endOfDayIso(value: string): string {
  const date = parseDateString(value);
  if (!date) throw new Error("Invalid date.");
  date.setHours(23, 59, 59, 0);
  return date.toISOString();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "14 Nov 2026" from either YYYY-MM-DD or a full ISO timestamp (shown in the viewer's local time). */
export function formatDisplayDate(value: string): string {
  const date = parseDateString(value) ?? new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Whole days from today until the given ISO timestamp (negative once passed). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((startOfTarget - startOfToday) / 86_400_000);
}

export function mimeTypeFromUri(uri: string): string | null {
  const extension = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(uri)?.[1]?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return null;
}

export function validateImageMeta(image: { mimeType: string; size?: number | null }): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(image.mimeType)) return "Choose a JPG, PNG or WebP image.";
  if (typeof image.size === "number" && image.size > MAX_IMAGE_BYTES) {
    return `This image is ${(image.size / (1024 * 1024)).toFixed(1)} MB. Images must be 5 MB or smaller.`;
  }
  if (typeof image.size === "number" && image.size <= 0) return "The selected image appears to be empty.";
  return null;
}

export function hasErrors(errors: Record<string, string | null | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
