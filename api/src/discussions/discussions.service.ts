import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CounsellorAvailability, DiscussionStatus, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class DiscussionsService {
  constructor(private readonly prisma: PrismaService) {}

  async counsellorProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== UserRole.COUNSELLOR) throw new ForbiddenException('Counsellor access is required.');
    const profile = await this.prisma.counsellorProfile.findUnique({ where: { userId }, include: { topics: { include: { topic: { select: { id: true, name: true } } } } } });
    if (!profile) throw new NotFoundException('Counsellor profile not found.');
    const activeDiscussions = await this.prisma.discussionAssignment.count({ where: { counsellorId: profile.id, releasedAt: null, discussion: { status: { in: [DiscussionStatus.ASSIGNED, DiscussionStatus.IN_PROGRESS, DiscussionStatus.WAITING_FOR_MEMBER] } } } });
    let availability = profile.availability;
    if (activeDiscussions >= 5 && availability === CounsellorAvailability.AVAILABLE) {
      await this.prisma.counsellorProfile.update({ where: { id: profile.id }, data: { availability: CounsellorAvailability.BUSY } });
      availability = CounsellorAvailability.BUSY;
    } else if (activeDiscussions < 5 && availability === CounsellorAvailability.BUSY) {
      await this.prisma.counsellorProfile.update({ where: { id: profile.id }, data: { availability: CounsellorAvailability.AVAILABLE } });
      availability = CounsellorAvailability.AVAILABLE;
    }
    return { availability, activeDiscussions, averageRating: profile.averageRating === null ? null : Number(profile.averageRating), ratingCount: profile.ratingCount, topics: profile.topics.map(item => item.topic) };
  }

  async setCounsellorAvailability(userId: string, availability: CounsellorAvailability) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== UserRole.COUNSELLOR) throw new ForbiddenException('Counsellor access is required.');
    const profile = await this.prisma.counsellorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Counsellor profile not found.');
    const active = await this.prisma.discussionAssignment.count({ where: { counsellorId: profile.id, releasedAt: null, discussion: { status: { in: [DiscussionStatus.ASSIGNED, DiscussionStatus.IN_PROGRESS, DiscussionStatus.WAITING_FOR_MEMBER] } } } });
    if (availability === CounsellorAvailability.AVAILABLE && active >= 5) throw new BadRequestException('You have five active discussions and cannot accept another assignment.');
    const updated = await this.prisma.counsellorProfile.update({ where: { id: profile.id }, data: { availability } });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: 'COUNSELLOR_AVAILABILITY_CHANGED', entityType: 'CounsellorProfile', entityId: profile.id, metadata: { availability } } });
    return updated;
  }

  async listTopics() {
    return this.prisma.counsellingTopic.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, description: true } });
  }

  async create(user: AuthenticatedUser, input: { topicId: string; title: string; message: string }) {
    if (user.role !== UserRole.MEMBER) throw new ForbiddenException('Only member accounts can start a counselling discussion.');
    const topic = await this.prisma.counsellingTopic.findFirst({ where: { id: input.topicId, isActive: true } });
    if (!topic) throw new BadRequestException('The selected counselling topic is unavailable.');
    return this.prisma.$transaction(async tx => {
      const discussion = await tx.discussion.create({ data: { creatorId: user.id, topicId: topic.id, title: input.title.trim(), status: DiscussionStatus.OPEN } });
      await tx.discussionMessage.create({ data: { discussionId: discussion.id, authorId: user.id, body: input.message.trim() } });
      const counsellors = await tx.counsellorProfile.findMany({
        where: { availability: CounsellorAvailability.AVAILABLE, topics: { some: { topicId: topic.id } }, user: { status: 'ACTIVE' } },
        select: { id: true },
      });
      const candidates: { id: string; active: number; appointmentLoad: number }[] = [];
      for (const counsellor of counsellors) {
        const [active, appointmentLoad] = await Promise.all([
          tx.discussionAssignment.count({ where: { counsellorId: counsellor.id, releasedAt: null, discussion: { status: { in: [DiscussionStatus.ASSIGNED, DiscussionStatus.IN_PROGRESS, DiscussionStatus.WAITING_FOR_MEMBER] } } } }),
          tx.appointment.count({ where: { counsellorId: counsellor.id, status: { in: ['REQUESTED', 'CONFIRMED', 'RESCHEDULED'] }, startsAt: { gte: new Date() } } }),
        ]);
        if (active < 5) candidates.push({ id: counsellor.id, active, appointmentLoad });
      }
      candidates.sort((a, b) => a.active - b.active || a.appointmentLoad - b.appointmentLoad);
      if (candidates[0]) {
        await tx.discussionAssignment.create({ data: { discussionId: discussion.id, counsellorId: candidates[0].id, assignedByRule: 'TOPIC_AVAILABILITY_LOAD' } });
        await tx.discussion.update({ where: { id: discussion.id }, data: { status: DiscussionStatus.ASSIGNED } });
        const assignedCounsellor = await tx.counsellorProfile.findUnique({ where: { id: candidates[0].id }, select: { userId: true } });
        if (assignedCounsellor) {
          await tx.userNotification.create({ data: { userId: assignedCounsellor.userId, title: 'New counselling discussion', body: `A member has started a discussion about ${topic.name}.`, type: 'DISCUSSION' } });
          const activeAfterAssignment = await tx.discussionAssignment.count({ where: { counsellorId: candidates[0].id, releasedAt: null, discussion: { status: { in: [DiscussionStatus.ASSIGNED, DiscussionStatus.IN_PROGRESS, DiscussionStatus.WAITING_FOR_MEMBER] } } } });
          if (activeAfterAssignment >= 5) await tx.counsellorProfile.update({ where: { id: candidates[0].id }, data: { availability: CounsellorAvailability.BUSY } });
        }
        await tx.userNotification.create({ data: { userId: user.id, title: 'Counsellor assigned', body: `Your ${topic.name} discussion has been assigned to a counsellor.`, type: 'DISCUSSION' } });
        return tx.discussion.update({ where: { id: discussion.id }, data: { status: DiscussionStatus.ASSIGNED }, include: { topic: true, assignments: { include: { counsellor: { include: { user: { select: { displayName: true } } } } } }, messages: { orderBy: { createdAt: 'asc' } } } });
      }
      await tx.userNotification.create({ data: { userId: user.id, title: 'Discussion received', body: `Your ${topic.name} discussion has been received. We will notify you when a counsellor becomes available.`, type: 'DISCUSSION' } });
      return tx.discussion.findUnique({ where: { id: discussion.id }, include: { topic: true, messages: { orderBy: { createdAt: 'asc' } } } });
    }, { isolationLevel: 'Serializable' });
  }

  async list(user: AuthenticatedUser) {
    const where: Prisma.DiscussionWhereInput = user.role === UserRole.MEMBER
      ? { creatorId: user.id }
      : user.role === UserRole.COUNSELLOR
        ? { assignments: { some: { releasedAt: null, counsellor: { userId: user.id } } } }
        : {};
    return this.prisma.discussion.findMany({ where, orderBy: { updatedAt: 'desc' }, include: {
      topic: { select: { id: true, name: true } }, creator: { select: { id: true, displayName: true } },
      assignments: { where: { releasedAt: null }, include: { counsellor: { include: { user: { select: { id: true, displayName: true } } } } } },
      _count: { select: { messages: true } },
    } });
  }

  async get(user: AuthenticatedUser, id: string) {
    const discussion = await this.prisma.discussion.findUnique({ where: { id }, include: {
      topic: true, creator: { select: { id: true, displayName: true } },
      assignments: { where: { releasedAt: null }, include: { counsellor: { include: { user: { select: { id: true, displayName: true } } } } } },
      messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, displayName: true, role: true } } } },
    } });
    if (!discussion) throw new NotFoundException('Discussion not found.');
    await this.assertAccess(user, discussion);
    return discussion;
  }

  async sendMessage(user: AuthenticatedUser, id: string, body: string) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id },
      include: { assignments: { where: { releasedAt: null }, include: { counsellor: true } } },
    });
    if (!discussion) throw new NotFoundException('Discussion not found.');
    await this.assertAccess(user, discussion);
    if (([DiscussionStatus.COMPLETED, DiscussionStatus.CANCELLED] as DiscussionStatus[]).includes(discussion.status)) {
      throw new BadRequestException('This discussion is closed.');
    }

    return this.prisma.$transaction(async tx => {
      const message = await tx.discussionMessage.create({
        data: { discussionId: id, authorId: user.id, body: body.trim() },
        include: { author: { select: { id: true, displayName: true, role: true } } },
      });
      if (user.role === UserRole.COUNSELLOR && discussion.status === DiscussionStatus.ASSIGNED) {
        await tx.discussion.update({ where: { id }, data: { status: DiscussionStatus.IN_PROGRESS } });
      } else {
        await tx.discussion.update({ where: { id }, data: { updatedAt: new Date() } });
      }

      const recipients = user.role === UserRole.MEMBER
        ? discussion.assignments.map(assignment => assignment.counsellor.userId)
        : [discussion.creatorId];
      for (const recipientId of [...new Set(recipients)].filter(recipientId => recipientId !== user.id)) {
        await tx.userNotification.create({
          data: {
            userId: recipientId,
            title: 'New discussion message',
            body: `There is a new message in: ${discussion.title}`,
            type: 'DISCUSSION',
          },
        });
      }
      await tx.auditLog.create({
        data: { actorId: user.id, action: 'DISCUSSION_MESSAGE_SENT', entityType: 'Discussion', entityId: id },
      });
      return message;
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: DiscussionStatus) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id },
      include: { assignments: { where: { releasedAt: null }, include: { counsellor: true } } },
    });
    if (!discussion) throw new NotFoundException('Discussion not found.');
    await this.assertAccess(user, discussion);

    const transitions: Record<DiscussionStatus, DiscussionStatus[]> = {
      [DiscussionStatus.OPEN]: [DiscussionStatus.CANCELLED],
      [DiscussionStatus.REASSIGNMENT_REQUIRED]: [DiscussionStatus.CANCELLED],
      [DiscussionStatus.ASSIGNED]: [DiscussionStatus.IN_PROGRESS, DiscussionStatus.WAITING_FOR_MEMBER, DiscussionStatus.COMPLETED, DiscussionStatus.CANCELLED],
      [DiscussionStatus.IN_PROGRESS]: [DiscussionStatus.WAITING_FOR_MEMBER, DiscussionStatus.COMPLETED, DiscussionStatus.CANCELLED],
      [DiscussionStatus.WAITING_FOR_MEMBER]: [DiscussionStatus.IN_PROGRESS, DiscussionStatus.COMPLETED, DiscussionStatus.CANCELLED],
      [DiscussionStatus.COMPLETED]: [],
      [DiscussionStatus.CANCELLED]: [],
    };
    if (!(transitions[discussion.status] as DiscussionStatus[]).includes(status)) {
      throw new BadRequestException(`A discussion cannot move from ${discussion.status.toLowerCase().replaceAll('_', ' ')} to ${status.toLowerCase().replaceAll('_', ' ')}.`);
    }
    if (user.role === UserRole.MEMBER && status !== DiscussionStatus.CANCELLED) {
      throw new ForbiddenException('Members can only cancel their own discussions.');
    }

    return this.prisma.$transaction(async tx => {
      const updated = await tx.discussion.update({
        where: { id },
        data: { status, completedAt: status === DiscussionStatus.COMPLETED ? new Date() : null },
      });
      const closesDiscussion = status === DiscussionStatus.COMPLETED || status === DiscussionStatus.CANCELLED;
      if (closesDiscussion && discussion.assignments.length) {
        await tx.discussionAssignment.updateMany({
          where: { discussionId: id, releasedAt: null },
          data: { releasedAt: new Date(), releaseReason: status },
        });
        for (const assignment of discussion.assignments) {
          const activeCount = await tx.discussionAssignment.count({
            where: {
              counsellorId: assignment.counsellorId,
              releasedAt: null,
              discussion: { status: { in: [DiscussionStatus.ASSIGNED, DiscussionStatus.IN_PROGRESS, DiscussionStatus.WAITING_FOR_MEMBER] } },
            },
          });
          if (activeCount < 5) {
            await tx.counsellorProfile.updateMany({
              where: { id: assignment.counsellorId, availability: CounsellorAvailability.BUSY },
              data: { availability: CounsellorAvailability.AVAILABLE },
            });
          }
        }
      }

      const notifyIds = user.role === UserRole.MEMBER
        ? discussion.assignments.map(assignment => assignment.counsellor.userId)
        : [discussion.creatorId];
      for (const recipientId of [...new Set(notifyIds)].filter(recipientId => recipientId !== user.id)) {
        await tx.userNotification.create({
          data: {
            userId: recipientId,
            title: 'Discussion updated',
            body: `Your discussion “${discussion.title}” is now ${status.toLowerCase().replaceAll('_', ' ')}.`,
            type: 'DISCUSSION',
          },
        });
      }
      await tx.auditLog.create({
        data: { actorId: user.id, action: 'DISCUSSION_STATUS_CHANGED', entityType: 'Discussion', entityId: id, metadata: { from: discussion.status, to: status } },
      });
      return updated;
    });
  }

  private async assertAccess(user: AuthenticatedUser, discussion: { creatorId: string; assignments: { counsellor: { userId: string } }[] }) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN || discussion.creatorId === user.id) return;
    if (user.role === UserRole.COUNSELLOR && discussion.assignments.some(a => a.counsellor.userId === user.id)) return;
    throw new ForbiddenException('You do not have access to this discussion.');
  }
}
