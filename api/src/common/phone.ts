/**
 * Turns a phone number as people type it into WhatsApp's international digits-only format (no "+"), e.g.
 * "0803 123 4567" -> "2348031234567" and "+44 7700 900123" -> "447700900123". Numbers starting with a single 0 are
 * treated as Nigerian. Returns null when the result cannot be a real international number.
 */
export function toWhatsAppNumber(input: string): string | null {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (!trimmed.startsWith('+') && digits.startsWith('00')) digits = digits.slice(2);
  else if (!trimmed.startsWith('+') && digits.startsWith('0') && digits.length === 11) digits = `234${digits.slice(1)}`;
  if (digits.startsWith('2340')) digits = `234${digits.slice(4)}`;
  if (digits.length < 10 || digits.length > 15 || digits.startsWith('0')) return null;
  return digits;
}
