/**
 * Message receipts for discussions, WhatsApp style:
 *   clock        sending (on this phone, not on the server yet)
 *   ✓            sent (saved on the server)
 *   ✓✓ grey      delivered (the other side's app has received it)
 *   ✓✓ blue      seen (the other side has had the conversation open)
 *   !            not sent (tap to retry)
 *
 * A conversation has two sides: the member who started it, and the staff answering it (counsellor or admin).
 * Kept free of React and app imports so it can be unit tested on its own.
 */

export type Receipt = "sending" | "failed" | "sent" | "delivered" | "seen";

export type ReceiptFields = { deliveredAt?: string | null; readAt?: string | null };
export type MessageLike = ReceiptFields & { id: string; createdAt: string; clientId?: string | null; author: { id: string } };

/** A message typed on this phone that the server has not confirmed yet. */
export type PendingMessage = { clientId: string; body: string; createdAt: string; state: "sending" | "failed"; error?: string };

export function receiptFor(message: ReceiptFields): Receipt {
  if (message.readAt) return "seen";
  if (message.deliveredAt) return "delivered";
  return "sent";
}

export const RECEIPT_LABEL: Record<Receipt, string> = {
  sending: "Sending",
  failed: "Not sent",
  sent: "Sent",
  delivered: "Delivered",
  seen: "Seen",
};

/** Which side someone writes from in a discussion started by `creatorId`. */
export function sideOf(userId: string | undefined, creatorId: string | undefined): "member" | "staff" {
  return userId && userId === creatorId ? "member" : "staff";
}

/** Messages from the other side that this person has not seen yet (what the conversation should mark as seen). */
export function unseenFromOtherSide(messages: MessageLike[], viewerId: string | undefined, creatorId: string | undefined): MessageLike[] {
  const mine = sideOf(viewerId, creatorId);
  return messages.filter((message) => !message.readAt && sideOf(message.author.id, creatorId) !== mine);
}

/** New messages from anyone else since the last check (what plays the "message received" sound). */
export function newIncoming(previous: { id: string }[], next: MessageLike[], viewerId: string | undefined): MessageLike[] {
  const known = new Set(previous.map((message) => message.id));
  return next.filter((message) => !known.has(message.id) && message.author.id !== viewerId);
}

/**
 * Pending messages still to show under the conversation: the ones the server has not returned yet. Once the
 * server copy (same client id) arrives, the pending copy is dropped, so a message is never shown twice.
 */
export function stillPending(pending: PendingMessage[], serverMessages: { clientId?: string | null }[]): PendingMessage[] {
  const confirmed = new Set(serverMessages.map((message) => message.clientId).filter(Boolean));
  return pending.filter((item) => !confirmed.has(item.clientId));
}

/** Adds a message the server returned, unless a poll already brought it in. Keeps time order. */
export function withMessage<T extends MessageLike>(messages: T[], message: T): T[] {
  if (messages.some((item) => item.id === message.id)) return messages;
  return [...messages, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Marks messages as seen locally right after telling the server, so the next check does not ask again. */
export function markedSeen<T extends MessageLike>(messages: T[], ids: Set<string>, at: string): T[] {
  return messages.map((message) => (ids.has(message.id) ? { ...message, readAt: message.readAt ?? at, deliveredAt: message.deliveredAt ?? at } : message));
}

/**
 * A short fingerprint of what the screen shows (messages, their receipts, and the status), so a check that brings
 * nothing new does not re-render the conversation.
 */
export function conversationSignature(status: string, messages: MessageLike[]): string {
  return `${status}|${messages.map((message) => `${message.id}:${message.deliveredAt ? "d" : ""}${message.readAt ? "r" : ""}`).join(",")}`;
}

/** An id for a new message: unique enough for one person's messages, and within the server's 8–64 [A-Za-z0-9_-]. */
export function makeClientId(now = Date.now(), random = Math.random): string {
  return `m${now.toString(36)}${Math.floor(random() * 36 ** 8).toString(36).padStart(8, "0")}`;
}

/** How long to wait before checking the conversation again: quicker while people are actively writing. */
export const POLL_ACTIVE_MS = 4_000;
export const POLL_IDLE_MS = 15_000;
export const ACTIVE_WINDOW_MS = 2 * 60_000;
export function nextPollDelay(lastActivityAt: number, now = Date.now()): number {
  return now - lastActivityAt < ACTIVE_WINDOW_MS ? POLL_ACTIVE_MS : POLL_IDLE_MS;
}
