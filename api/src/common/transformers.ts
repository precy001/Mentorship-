import { Transform } from 'class-transformer';

/** Trims surrounding whitespace so "   " cannot satisfy a minimum-length rule. */
export const Trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Trims and lower-cases (email addresses). */
export const NormalizeEmail = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
