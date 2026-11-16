import { NotFoundException } from '@nestjs/common';
import { createNotification, NotificationsService } from '../src/notifications/notifications.service';
import type { PrismaService } from '../src/prisma/prisma.service';

function build(rows: { id: string; createdAt: Date; readAt: Date | null }[]) {
  const seen: { where?: Record<string, unknown>; take?: number } = {};
  const prisma = {
    userNotification: {
      findMany: async (args: { where: Record<string, unknown>; take: number }) => { seen.where = args.where; seen.take = args.take; return rows.slice(0, args.take); },
      count: async () => rows.filter((row) => !row.readAt).length,
      updateMany: async (args: { where: { id?: string } }) => ({ count: args.where.id === 'mine' ? 1 : args.where.id ? 0 : rows.filter((row) => !row.readAt).length }),
      findFirst: async () => null,
    },
  };
  return { service: new NotificationsService(prisma as unknown as PrismaService), seen };
}

const rows = Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, createdAt: new Date(2026, 10, 15 - i), readAt: i % 2 ? new Date() : null }));

describe('NotificationsService', () => {
  it('pages history and reports whether more exists', async () => {
    const { service } = build(rows);
    const page = await service.list('u1', { limit: 3 });
    expect(page.items).toHaveLength(3);
    expect(page.hasMore).toBe(true);
    expect((await service.list('u1', { limit: 10 })).hasMore).toBe(false);
  });

  it('only ever queries the caller’s own notifications and clamps the page size', async () => {
    const { service, seen } = build(rows);
    await service.list('u1', { limit: 9999, unreadOnly: true });
    expect(seen.where).toMatchObject({ userId: 'u1', readAt: null });
    expect(seen.take).toBe(101);
  });

  it('counts unread and marks all read', async () => {
    const { service } = build(rows);
    expect(await service.unreadCount('u1')).toEqual({ unread: 3 });
    expect(await service.markAllRead('u1')).toEqual({ updated: 3 });
  });

  it('answers 404 when a notification is not the caller’s', async () => {
    const { service } = build(rows);
    await expect(service.markRead('u1', 'someone-elses')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.markRead('u1', 'mine')).resolves.toEqual({ success: true });
  });

  it('truncates over-long notification text to the column limits', async () => {
    let saved: { data: { title: string; body: string } } | undefined;
    await createNotification({ userNotification: { create: async (args: { data: { title: string; body: string } }) => { saved = args; return {}; } } } as never, 'u1', 'T'.repeat(500), 'B'.repeat(5000), 'GENERAL');
    expect(saved?.data.title.length).toBe(180);
    expect(saved?.data.body.length).toBe(1000);
  });
});
