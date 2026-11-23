import 'reflect-metadata';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AdminService } from '../src/admin/admin.service';
import { renderPage } from '../src/admin/invite-link.controller';
import { toWhatsAppNumber } from '../src/common/phone';

describe('toWhatsAppNumber', () => {
  it('turns local Nigerian and international numbers into WhatsApp digits', () => {
    expect(toWhatsAppNumber('0803 123 4567')).toBe('2348031234567');
    expect(toWhatsAppNumber('+234 803 123 4567')).toBe('2348031234567');
    expect(toWhatsAppNumber('+234 0803 123 4567')).toBe('2348031234567');
    expect(toWhatsAppNumber('00447700900123')).toBe('447700900123');
    expect(toWhatsAppNumber('+44 7700 900123')).toBe('447700900123');
  });
  it('rejects numbers that cannot be real', () => {
    for (const value of ['', '123', 'abc', '+0123456789', '1234567890123456']) expect(toWhatsAppNumber(value)).toBeNull();
  });
});

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

function build() {
  const tx = {
    counsellorInvitation: { updateMany: jest.fn(async (_args: unknown) => ({ count: 1 })) },
    user: { findMany: jest.fn(async () => [{ id: 'admin-1' }]), update: jest.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, email: 'new@example.com', role: 'COUNSELLOR' })) },
    userNotification: { create: jest.fn(async (_args: unknown) => ({})) },
    auditLog: { create: jest.fn(async (_args: unknown) => ({})) },
    counsellorProfile: { upsert: jest.fn(async () => ({ id: 'p-new' })) },
    counsellorTopicAssignment: { deleteMany: jest.fn(async () => ({})), createMany: jest.fn(async (_args: unknown) => ({})) },
  };
  const prisma = {
    counsellorInvitation: { count: jest.fn(async () => 0), create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'inv-1', ...data })), findUnique: jest.fn() },
    counsellorProfile: { findUnique: jest.fn(async () => ({ topics: [{ topicId: 't1' }, { topicId: 't2' }] })) },
    counsellingTopic: { findMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.map((id) => ({ id }))) },
    user: { findUnique: jest.fn(async () => ({ id: 'member-1', email: 'new@example.com', role: 'MEMBER', status: 'ACTIVE' })) },
    auditLog: { create: jest.fn(async (_args: unknown) => ({})) },
    $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const service = new AdminService(prisma as never, {} as never, {} as never, {} as never, {} as never);
  return { service, prisma, tx };
}

const counsellor = { id: 'c-1', email: 'c@example.com', role: 'COUNSELLOR', status: 'ACTIVE' } as never;
const admin = { id: 'admin-1', email: 'a@example.com', role: 'ADMIN', status: 'ACTIVE' } as never;
const member = { id: 'member-1', email: 'new@example.com', role: 'MEMBER', status: 'ACTIVE' } as never;

describe('WhatsApp counsellor invitations', () => {
  it("a counsellor's invitation uses their topics and needs admin approval", async () => {
    const { service, prisma } = build();
    const result = await service.inviteCounsellorByWhatsApp(counsellor, { phoneNumber: '0803 123 4567', name: ' Ada ' });
    const data = prisma.counsellorInvitation.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ channel: 'WHATSAPP', phoneNumber: '2348031234567', inviteeName: 'Ada', topicIds: ['t1', 't2'], requiresApproval: true, invitedById: 'c-1' });
    expect(data.tokenHash).toBe(hash(result.token));
    expect(result).toMatchObject({ requiresApproval: true, whatsappNumber: '2348031234567', invitePath: `/invite/${result.token}` });
  });

  it("an admin's invitation needs topics and no approval", async () => {
    const { service, prisma } = build();
    await expect(service.inviteCounsellorByWhatsApp(admin, { phoneNumber: '08031234567' })).rejects.toBeInstanceOf(BadRequestException);
    const result = await service.inviteCounsellorByWhatsApp(admin, { phoneNumber: '08031234567', topicIds: ['t9'] });
    expect(result.requiresApproval).toBe(false);
    expect(prisma.counsellorInvitation.create.mock.calls[0][0].data).toMatchObject({ topicIds: ['t9'], requiresApproval: false });
  });

  it('limits how many invitations one person sends a day and rejects bad numbers', async () => {
    const { service, prisma } = build();
    await expect(service.inviteCounsellorByWhatsApp(counsellor, { phoneNumber: '12' })).rejects.toBeInstanceOf(BadRequestException);
    prisma.counsellorInvitation.count.mockResolvedValueOnce(AdminService.WHATSAPP_INVITES_PER_DAY);
    await expect(service.inviteCounsellorByWhatsApp(counsellor, { phoneNumber: '08031234567' })).rejects.toThrow(/a day/);
    expect(prisma.counsellorInvitation.create).not.toHaveBeenCalled();
  });

  it('accepting a counsellor invitation sends it to administrators instead of granting the role', async () => {
    const { service, prisma, tx } = build();
    prisma.counsellorInvitation.findUnique.mockResolvedValue({ id: 'inv-1', email: null, channel: 'WHATSAPP', requiresApproval: true, invitedById: 'c-1', topicIds: ['t1'], acceptedAt: null, expiresAt: new Date(Date.now() + 60_000) });
    const result = await service.acceptCounsellorInvitation(member, 'x'.repeat(43));
    expect(result.status).toBe('PENDING_APPROVAL');
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.counsellorInvitation.updateMany.mock.calls[0][0]).toMatchObject({ data: { acceptedById: 'member-1' } });
    expect(tx.userNotification.create).toHaveBeenCalledTimes(3); // admin, inviter, applicant
  });

  it('cannot be accepted by the person who sent it', async () => {
    const { service, prisma } = build();
    prisma.counsellorInvitation.findUnique.mockResolvedValue({ id: 'inv-1', email: null, requiresApproval: true, invitedById: 'member-1', topicIds: [], acceptedAt: null, expiresAt: new Date(Date.now() + 60_000) });
    await expect(service.acceptCounsellorInvitation(member, 'x'.repeat(43))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('email invitations still require the matching account', async () => {
    const { service, prisma } = build();
    prisma.counsellorInvitation.findUnique.mockResolvedValue({ id: 'inv-2', email: 'someone@else.com', requiresApproval: false, invitedById: 'admin-1', topicIds: ['t1'], acceptedAt: null, expiresAt: new Date(Date.now() + 60_000) });
    await expect(service.acceptCounsellorInvitation(member, 'x'.repeat(43))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('approval grants the counsellor role with the invitation topics', async () => {
    const { service, prisma, tx } = build();
    prisma.counsellorInvitation.findUnique.mockResolvedValue({ id: 'inv-1', requiresApproval: true, acceptedAt: new Date(), acceptedById: 'member-1', approvedAt: null, declinedAt: null, invitedById: 'c-1', topicIds: ['t1', 't2'] });
    const result = await service.approveCounsellorRequest(admin, 'inv-1');
    expect(result).toEqual({ success: true, topicsAssigned: 2 });
    expect(tx.user.update.mock.calls[0][0]).toMatchObject({ where: { id: 'member-1' }, data: { role: 'COUNSELLOR' } });
    expect(tx.counsellorTopicAssignment.createMany).toHaveBeenCalled();
  });

  it('does not approve a request twice', async () => {
    const { service, prisma } = build();
    prisma.counsellorInvitation.findUnique.mockResolvedValue({ id: 'inv-1', requiresApproval: true, acceptedAt: new Date(), acceptedById: 'member-1', approvedAt: new Date(), declinedAt: null, invitedById: 'c-1', topicIds: [] });
    await expect(service.approveCounsellorRequest(admin, 'inv-1')).rejects.toThrow(/already been decided/);
  });
});

describe('invitation web page', () => {
  it('links to the app and escapes what it prints', () => {
    const html = renderPage('guidanceplus://counsellor-invite?token=abc"<x>');
    expect(html).toContain('href="guidanceplus://counsellor-invite?token=abc&quot;&lt;x&gt;"');
    expect(html).not.toContain('<x>');
    expect(renderPage(null)).toContain("isn't valid");
  });
});
