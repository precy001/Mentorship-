/**
 * Predefined classifications for admin-published content.
 * Keep these lists in sync with src/lib/options.ts in the mobile app.
 * Existing records created before these lists existed are never modified.
 */
export const RESOURCE_CATEGORIES = [
  'Career',
  'Business',
  'Education',
  'Study Skills',
  'Finance',
  'Wellbeing',
  'Personal Development',
  'General',
] as const;

export const SCHOLARSHIP_LEVELS = [
  'All levels',
  'Secondary School',
  'Undergraduate',
  'Postgraduate',
  'Vocational & Technical',
  'Professional / Career',
] as const;

export const MAX_READ_MINUTES = 180;
/** "5 min read" … "180 min read". */
export const READ_TIME_PATTERN = /^(?:[1-9]|[1-9]\d|1[0-7]\d|180) min read$/;
export const CONTENT_IMAGE_FOLDER = 'content';
