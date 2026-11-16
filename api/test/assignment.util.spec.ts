import { CounsellorAvailability, DiscussionStatus } from '@prisma/client';
import { assignWaitingDiscussions, MAX_ACTIVE_DISCUSSIONS, syncCounsellorWorkload } from '../src/discussions/assignment.util';

type Tx = Parameters<typeof syncCounsellorWorkload>[0];

function fakeTx(options: { active: number; availability: CounsellorAvailability; userStatus?: string; waiting?: { id: string; title: string; creatorId: string; topic: { name: string } }[]; topics?: string[] }) {
  const calls = { updateMany: [] as unknown[], assignments: [] as unknown[], notifications: [] as unknown[], discussionUpdates: [] as unknown[], take: 0 };
  const tx = {
    counsellorProfile: {
      findUnique: async () => ({ id: 'c1', userId: 'u1', availability: options.availability, user: { status: options.userStatus ?? 'ACTIVE' }, topics: (options.topics ?? ['t1']).map((topicId) => ({ topicId })) }),
      updateMany: async (args: unknown) => { calls.updateMany.push(args); return { count: 1 }; },
    },
    discussionAssignment: { count: async () => options.active, create: async (args: unknown) => { calls.assignments.push(args); return {}; } },
    discussion: {
      findMany: async (args: { take: number }) => { calls.take = args.take; return (options.waiting ?? []).slice(0, args.take); },
      update: async (args: unknown) => { calls.discussionUpdates.push(args); return {}; },
    },
    userNotification: { create: async (args: unknown) => { calls.notifications.push(args); return {}; } },
    auditLog: { create: async () => ({}) },
  };
  return { tx: tx as unknown as Tx, calls };
}

const waiting = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `d${i}`, title: `Discussion ${i}`, creatorId: `m${i}`, topic: { name: 'Career Guidance' } }));

describe('syncCounsellorWorkload', () => {
  it('marks an Available counsellor Busy at five active discussions', async () => {
    const { tx, calls } = fakeTx({ active: MAX_ACTIVE_DISCUSSIONS, availability: CounsellorAvailability.AVAILABLE });
    await syncCounsellorWorkload(tx, 'c1');
    expect(JSON.stringify(calls.updateMany[0])).toContain('BUSY');
  });

  it('returns a Busy counsellor to Available below five', async () => {
    const { tx, calls } = fakeTx({ active: 4, availability: CounsellorAvailability.BUSY });
    await syncCounsellorWorkload(tx, 'c1');
    expect(JSON.stringify(calls.updateMany[0])).toContain('AVAILABLE');
  });
});

describe('assignWaitingDiscussions', () => {
  it('assigns only as many discussions as free capacity allows', async () => {
    const { tx, calls } = fakeTx({ active: 3, availability: CounsellorAvailability.AVAILABLE, waiting: waiting(4) });
    const assigned = await assignWaitingDiscussions(tx, 'c1');
    expect(calls.take).toBe(2);
    expect(assigned).toBe(2);
    expect(calls.assignments).toHaveLength(2);
    expect(calls.notifications).toHaveLength(4); // counsellor and member for each discussion
    expect(calls.discussionUpdates.every((call) => JSON.stringify(call).includes(DiscussionStatus.ASSIGNED))).toBe(true);
  });

  it('assigns nothing at capacity, when not Available, or when the account is not active', async () => {
    for (const options of [
      { active: 5, availability: CounsellorAvailability.AVAILABLE },
      { active: 0, availability: CounsellorAvailability.OFFLINE },
      { active: 0, availability: CounsellorAvailability.AVAILABLE, userStatus: 'SUSPENDED' },
    ]) {
      const { tx, calls } = fakeTx({ ...options, waiting: waiting(2) });
      expect(await assignWaitingDiscussions(tx, 'c1')).toBe(0);
      expect(calls.assignments).toHaveLength(0);
    }
  });

  it('assigns nothing when the counsellor has no topics', async () => {
    const { tx } = fakeTx({ active: 0, availability: CounsellorAvailability.AVAILABLE, waiting: waiting(2), topics: [] });
    expect(await assignWaitingDiscussions(tx, 'c1')).toBe(0);
  });
});
