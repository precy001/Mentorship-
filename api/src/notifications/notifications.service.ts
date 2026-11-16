import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType = 'GENERAL' | 'DISCUSSION' | 'APPOINTMENT' | 'ACCOUNT' | 'RATING' | 'COUNSELLOR';
type Writer = Pick<Prisma.TransactionClient, 'userNotification'>;

/** Writes a notification inside the caller's transaction, so it exists only if the action it describes committed. */
export async function createNotification(
  db: Writer,
  userId: string,
  title: string,
  body: string,
  type: NotificationType = 'GENERAL',
): Promise<void> {
  await db.userNotification.create({ data: { userId, title: title.slice(0, 180), body: body.slice(0, 1000), type } });
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first. `before` is the createdAt of the last item already shown (cursor paging). */
  async list(userId: string, options: { limit?: number; before?: string; unreadOnly?: boolean }) {
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
    const before = options.before ? new Date(options.before) : null;
    const items = await this.prisma.userNotification.findMany({
      where: {
        userId,
        ...(options.unreadOnly ? { readAt: null } : {}),
        ...(before && Number.isFinite(before.getTime()) ? { createdAt: { lt: before } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = items.length > limit;
    return { items: hasMore ? items.slice(0, limit) : items, hasMore };
  }

  async unreadCount(userId: string): Promise<{ unread: number }> {
    return { unread: await this.prisma.userNotification.count({ where: { userId, readAt: null } }) };
  }

  async markRead(userId: string, id: string): Promise<{ success: true }> {
    const result = await this.prisma.userNotification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    if (!result.count) {
      const exists = await this.prisma.userNotification.findFirst({ where: { id, userId }, select: { id: true } });
      if (!exists) throw new NotFoundException('Notification not found.');
    }
    return { success: true };
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.userNotification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }
}
