/**
 * Image validation shared by every upload path (profile photos and admin content images).
 * The declared MIME type comes from the client and cannot be trusted, so the file's
 * leading bytes ("magic numbers") are inspected as well.
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function sniffImageType(buffer: Uint8Array | undefined | null): AllowedImageType | null {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, index) => buffer[index] === byte)) return 'image/png';
  const ascii = (start: number, length: number) => String.fromCharCode(...Array.from(buffer.slice(start, start + length)));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  return null;
}

export function extensionForImageType(type: AllowedImageType): 'jpg' | 'png' | 'webp' {
  return type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
}
