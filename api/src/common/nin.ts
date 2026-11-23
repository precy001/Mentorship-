import { Transform } from 'class-transformer';

/** National Identification Number: exactly 11 digits. Spaces and dashes typed by people are removed first. */
export const NIN_PATTERN = /^\d{11}$/;
export const NIN_MESSAGE = 'Enter your 11-digit National Identification Number (NIN).';
export const NormalizeNin = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value));
