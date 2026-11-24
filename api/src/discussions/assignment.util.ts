import { CounsellorAvailability, DiscussionStatus, Prisma, UserStatus } from '@prisma/client';
import { createNotification } from '../notifications/notifications.service';

/** A counsellor may hold at most this many active discussions at once. */
export const MAX_ACTIVE_DISCUSSIONS = 5;
export const ACTIVE_DISCUSSION_STATUSES: DiscussionStatus[] = [
  DiscussionStatus.ASSIGNED,
  DiscussionStatus.IN_PROGRESS,
  DiscussionStatus.WAITING_FOR_MEMBER,
];

export function countActiveDiscussions(tx: Prisma.TransactionClient, counsellorId: string): Promise<number> {
  return tx.discussionAssignment.count({
    where: { counsellorId, releasedAt: null, discussion: { status: { in: ACTIVE_DISCUSSION_STATUSES } } },
  });
}

/** Keeps the automatic Available/Busy status in line with the real workload. Manual states (offline, leave) are never touched. */
export async function syncCounsellorWorkload(tx: Prisma.TransactionClient, counsellorId: string): Promise<void> {
  const active = await countActiveDiscussions(tx, counsellorId);
  if (active >= MAX_ACTIVE_DISCUSSIONS) {
    await tx.counsellorProfile.updateMany({ where: { id: counsellorId, availability: CounsellorAvailability.AVAILABLE }, data: { availability: CounsellorAvailability.BUSY } });
  } else {
    await tx.counsellorProfile.updateMany({ where: { id: counsellorId, availability: CounsellorAvailability.BUSY }, data: { availability: CounsellorAvailability.AVAILABLE } });
  }
}

/**
 * Hands discussions that are still waiting for a counsellor (oldest first) to a counsellor who has just become
 * available or freed capacity. Only the counsellor's own topics are considered and the five-discussion limit holds.
 * Must run inside the caller's transaction. Returns how many discussions were assigned.
 */
export async function assignWaitingDiscussions(tx: Prisma.TransactionClient, counsellorId: string): Promise<number> {
  const counsellor = await tx.counsellorProfile.findUnique({
    where: { id: counsellorId },
    select: { id: true, userId: true, availability: true, user: { select: { status: true } }, topics: { select: { topicId: true } } },
  });
  if (!counsellor || counsellor.user.status !== UserStatus.ACTIVE || counsellor.availability !== CounsellorAvailability.AVAILABLE || !counsellor.topics.length) return 0;

  const capacity = MAX_ACTIVE_DISCUSSIONS - (await countActiveDiscussions(tx, counsellorId));
  if (capacity <= 0) return 0;

  const waiting = await tx.discussion.findMany({
    where: {
      status: { in: [DiscussionStatus.OPEN, DiscussionStatus.REASSIGNMENT_REQUIRED] },
      topicId: { in: counsellor.topics.map((item) => item.topicId) },
      assignments: { none: { releasedAt: null } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: capacity,
    select: { id: true, title: true, creatorId: true, topic: { select: { name: true } } },
  });

  for (const discussion of waiting) {
    await tx.discussionAssignment.create({ data: { discussionId: discussion.id, counsellorId, assignedByRule: 'QUEUE_TOPIC_AVAILABILITY' } });
    await tx.discussion.update({ where: { id: discussion.id }, data: { status: DiscussionStatus.ASSIGNED } });
    await createNotification(tx, counsellor.userId, 'New counselling discussion', `A discussion about ${discussion.topic.name} has been assigned to you.`, 'DISCUSSION');
    await createNotification(tx, discussion.creatorId, 'Mentor assigned', `A mentor is now assigned to your ${discussion.topic.name} discussion: ${discussion.title}.`, 'DISCUSSION');
    await tx.auditLog.create({ data: { actorId: null, action: 'DISCUSSION_QUEUE_ASSIGNED', entityType: 'Discussion', entityId: discussion.id, metadata: { counsellorId } } });
  }
  if (waiting.length) await syncCounsellorWorkload(tx, counsellorId);
  return waiting.length;
}
