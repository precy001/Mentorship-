import { Prisma, UserRole } from '@prisma/client';

/**
 * Message receipts work like WhatsApp's ticks, for a conversation with two sides:
 *  - the member who started the discussion, and
 *  - the staff answering it (the assigned counsellor, or an administrator who steps in).
 *
 * A message is "delivered" when an app on the other side has received it, and "seen" when someone on the other
 * side has had the conversation open on screen. One side's own messages are never marked by that side, and an
 * administrator reading a conversation they are not part of never marks anything (oversight is not a read receipt).
 */
export type ConversationSide = 'member' | 'staff';

type Participants = { creatorId: string; assignments: { counsellor: { userId: string } }[] };

/** The side the viewer reads as, or null when they only oversee the conversation (administrators). */
export function viewerSide(user: { id: string; role: UserRole | string }, discussion: Participants): ConversationSide | null {
  if (discussion.creatorId === user.id) return 'member';
  if (user.role === UserRole.COUNSELLOR && discussion.assignments.some((assignment) => assignment.counsellor.userId === user.id)) return 'staff';
  return null;
}

/** Which side wrote a message. */
export function authorSide(authorId: string, creatorId: string): ConversationSide {
  return authorId === creatorId ? 'member' : 'staff';
}

/** Messages written by the other side, as a Prisma filter. */
export function fromOtherSide(side: ConversationSide, creatorId: string): Prisma.DiscussionMessageWhereInput {
  return side === 'member' ? { authorId: { not: creatorId } } : { authorId: creatorId };
}

/** Same rule for a message already loaded. */
export function isFromOtherSide(side: ConversationSide, creatorId: string, authorId: string): boolean {
  return authorSide(authorId, creatorId) !== side;
}
