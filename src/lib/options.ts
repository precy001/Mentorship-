/**
 * Predefined classifications for admin-published content.
 * Keep these lists in sync with api/src/content/content.constants.ts.
 */
export const RESOURCE_CATEGORIES = [
  "Career",
  "Business",
  "Education",
  "Study Skills",
  "Finance",
  "Wellbeing",
  "Personal Development",
  "General",
] as const;

export const SCHOLARSHIP_LEVELS = [
  "All levels",
  "Secondary School",
  "Undergraduate",
  "Postgraduate",
  "Vocational & Technical",
  "Professional / Career",
] as const;

export const READ_MINUTES_MIN = 1;
export const READ_MINUTES_MAX = 180;

export const toOptions = (values: readonly string[]) => values.map((value) => ({ label: value, value }));
export const readTimeLabel = (minutes: string) => `${Number(minutes)} min read`;
export const minutesFromReadTime = (readTime: string | null | undefined) => /^(\d{1,3})/.exec(readTime ?? "")?.[1] ?? "5";
