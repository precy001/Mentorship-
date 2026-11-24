/**
 * Counsellor invitations shared on WhatsApp. Kept free of React Native so it can be unit tested.
 * The server creates the private link; the administrator's own WhatsApp sends the message (nothing is sent
 * automatically), so the person receives it from someone they can see and reply to.
 */

/** Rough check before asking the server (which does the real validation). */
export function looksLikePhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function counsellorInvitationText({ name, link }: { name?: string; link: string }): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return [
    `${first ? `Hi ${first}` : "Hi"}, you're invited to join Mentorship+ as a mentor.`,
    "",
    "Open this link on your phone to accept (it expires in 7 days):",
    link,
    "",
    "You'll need the Mentorship+ app and an account. Sign in, then open the link again if the app asks you to.",
  ].join("\n");
}

/** wa.me link that opens a chat with this number and the message ready to send. */
export function whatsAppChatUrl(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
