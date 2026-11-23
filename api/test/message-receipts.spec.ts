import 'reflect-metadata';
import { Prisma } from '@prisma/client';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DiscussionsService } from '../src/discussions/discussions.service';
import { authorSide, fromOtherSide, isFromOtherSide, viewerSide } from '../src/discussions/receipts';

const member = { id: 'm-1', email: 'm@example.com', role: 'MEMBER', status: 'ACTIVE' } as never;
const counsellor = { id: 'c-1', email: 'c@example.com', role: 'COUNSELLOR', status: 'ACTIVE' } as never;
const otherCounsellor = { id: 'c-2', email: 'c2@example.com', role: 'COUNSELLOR', status: 'ACTIVE' } as never;
const admin = { id: 'a-1', email: 'a@example.com', role: 'ADMIN', status: 'ACTIVE' } as never;
const discussion = { id: 'd-1', title: 'Exams', status: 'IN_PROGRESS', creatorId: 'm-1', assignments: [{ counsellor: { userId: 'c-1' } }] };

describe('conversation sides', () => {
  it('knows which side each person reads as', () => {
    expect(viewerSide(member, discussion)).toBe('member');
    expect(viewerSide(counsellor, discussion)).toBe('staff');
    expect(viewerSide(otherCounsellor, discussion)).toBeNull(); // not assigned
    expect(viewerSide(admin, discussion)).toBeNull(); // oversight, not a participant
  });
  it('treats counsellor and admin replies as the same (staff) side', () => {
    expect(authorSide('m-1', 'm-1')).toBe('member');
    expect(authorSide('c-1', 'm-1')).toBe('staff');
    expect(authorSide('a-1', 'm-1')).toBe('staff');
    expect(isFromOtherSide('member', 'm-1', 'a-1')).toBe(true);
    expect(isFromOtherSide('staff', 'm-1', 'a-1')).toBe(false);
    expect(fromOtherSide('member', 'm-1')).toEqual({ authorId: { not: 'm-1' } });
    expect(fromOtherSide('staff', 'm-1')).toEqual({ authorId: 'm-1' });
  });
});

function build() {
  const prisma = {
    discussion: { findUnique: jest.fn(async () => discussion), findMany: jest.fn() },
    discussionMessage: {
      updateMany: jest.fn(async (_args: unknown) => ({ count: 2 })),
      findFirst: jest.fn(async (_args: unknown) => null as unknown),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (arg: unknown) => (Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(tx))),
  };
  const tx = {
    discussionMessage: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'msg-1', ...data, deliveredAt: null, readAt: null })) },
    discussion: { update: jest.fn(async () => ({})) },
    userNotification: { create: jest.fn(async () => ({})) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  return { service: new DiscussionsService(prisma as never), prisma, tx };
}

describe('seen (read) receipts', () => {
  it("the member opening the conversation marks staff messages delivered and seen, not their own", async () => {
    const { service, prisma } = build();
    const result = await service.markRead(member, 'd-1');
    expect(result.read).toBe(2);
    const [delivered, read] = prisma.discussionMessage.updateMany.mock.calls.map((call) => call[0] as { where: Record<string, unknown>; data: Record<string, unknown> });
    expect(delivered.where).toMatchObject({ discussionId: 'd-1', authorId: { not: 'm-1' }, deliveredAt: null });
    expect(delivered.data.deliveredAt).toBeInstanceOf(Date);
    expect(read.where).toMatchObject({ discussionId: 'd-1', authorId: { not: 'm-1' }, readAt: null });
    expect(read.data.readAt).toBe(delivered.data.deliveredAt); // one moment for both
  });

  it("the assigned counsellor marks the member's messages", async () => {
    const { service, prisma } = build();
    await service.markRead(counsellor, 'd-1');
    expect(prisma.discussionMessage.updateMany.mock.calls[1][0]).toMatchObject({ where: { discussionId: 'd-1', authorId: 'm-1', readAt: null } });
  });

  it('an administrator reading the conversation does not send a "seen"', async () => {
    const { service, prisma } = build();
    expect(await service.markRead(admin, 'd-1')).toEqual({ read: 0, at: null });
    expect(prisma.discussionMessage.updateMany).not.toHaveBeenCalled();
  });

  it('someone outside the conversation is refused', async () => {
    const { service } = build();
    await expect(service.markRead(otherCounsellor, 'd-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('delivered receipts', () => {
  it("marks only the other side's undelivered messages in each conversation", async () => {
    const { service, prisma } = build();
    prisma.discussion.findMany.mockResolvedValue([discussion, { ...discussion, id: 'd-2' }]);
    const result = await service.markDelivered(counsellor);
    expect(result).toEqual({ delivered: 2 });
    const findArgs = prisma.discussion.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(findArgs.where).toMatchObject({ messages: { some: { deliveredAt: null } } });
    expect(prisma.discussionMessage.updateMany.mock.calls[0][0]).toMatchObject({
      where: { deliveredAt: null, OR: [{ discussionId: 'd-1', authorId: 'm-1' }, { discussionId: 'd-2', authorId: 'm-1' }] },
    });
  });

  it('does nothing (no write) when nothing is waiting', async () => {
    const { service, prisma } = build();
    prisma.discussion.findMany.mockResolvedValue([]);
    expect(await service.markDelivered(member)).toEqual({ delivered: 0 });
    expect(prisma.discussionMessage.updateMany).not.toHaveBeenCalled();
  });

  it('administrators are never the recipient', async () => {
    const { service, prisma } = build();
    expect(await service.markDelivered(admin)).toEqual({ delivered: 0 });
    expect(prisma.discussion.findMany).not.toHaveBeenCalled();
  });
});

describe('sending with a client id (safe retries)', () => {
  it('saves the client id with a new message, which starts as "sent"', async () => {
    const { service, tx } = build();
    const message = await service.sendMessage(member, 'd-1', ' Hello ', 'abc12345');
    expect(tx.discussionMessage.create.mock.calls[0][0]).toMatchObject({ data: { body: 'Hello', clientId: 'abc12345', authorId: 'm-1' } });
    expect(message).toMatchObject({ deliveredAt: null, readAt: null });
  });

  it('a retried send returns the first copy instead of saving twice', async () => {
    const { service, prisma, tx } = build();
    prisma.discussionMessage.findFirst.mockResolvedValue({ id: 'msg-1', discussionId: 'd-1', clientId: 'abc12345' });
    expect(await service.sendMessage(member, 'd-1', 'Hello', 'abc12345')).toMatchObject({ id: 'msg-1' });
    expect(tx.discussionMessage.create).not.toHaveBeenCalled();
  });

  it('two retries racing each other: the unique index wins and the saved copy is returned', async () => {
    const { service, prisma, tx } = build();
    tx.discussionMessage.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }));
    prisma.discussionMessage.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'msg-1', discussionId: 'd-1' });
    expect(await service.sendMessage(member, 'd-1', 'Hello', 'abc12345')).toMatchObject({ id: 'msg-1' });
  });

  it('a client id cannot be reused in another discussion', async () => {
    const { service, prisma } = build();
    prisma.discussionMessage.findFirst.mockResolvedValue({ id: 'msg-1', discussionId: 'd-9' });
    await expect(service.sendMessage(member, 'd-1', 'Hello', 'abc12345')).rejects.toBeInstanceOf(ConflictException);
  });

  it('older apps that send no client id still work', async () => {
    const { service, tx, prisma } = build();
    await service.sendMessage(member, 'd-1', 'Hello');
    expect(prisma.discussionMessage.findFirst).not.toHaveBeenCalled();
    expect(tx.discussionMessage.create.mock.calls[0][0]).toMatchObject({ data: { clientId: null } });
  });
});
