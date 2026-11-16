import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, DiscussionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { createNotification } from '../notifications/notifications.service';
@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(user: AuthenticatedUser, input: { discussionId?: string; appointmentId?: string; score: number; feedback?: string }) {
    if (user.role !== UserRole.MEMBER) throw new ForbiddenException('Only members can submit counsellor ratings.');
    if (Boolean(input.discussionId) === Boolean(input.appointmentId)) throw new BadRequestException('Rate one completed discussion or one completed appointment.');
    let counsellorId: string;
    if (input.discussionId) {
      const discussion = await this.prisma.discussion.findFirst({ where: { id: input.discussionId, creatorId: user.id, status: DiscussionStatus.COMPLETED }, include: { assignments: { orderBy: { assignedAt: 'desc' }, take: 1 } } });
      if (!discussion || !discussion.assignments[0]) throw new BadRequestException('Only a completed discussion with an assigned counsellor can be rated.');
      counsellorId = discussion.assignments[0].counsellorId;
    } else {
      const appointmentId = input.appointmentId;
      if (!appointmentId) throw new BadRequestException('Choose an appointment to rate.');
      const appointment = await this.prisma.appointment.findFirst({ where: { id: appointmentId, memberId: user.id, status: AppointmentStatus.COMPLETED }, select: { counsellorId: true } });
      if (!appointment) throw new BadRequestException('Only a completed appointment can be rated.');
      counsellorId = appointment.counsellorId;
    }
    try {
      return await this.prisma.counsellorRating.create({ data: { authorId: user.id, counsellorId, discussionId: input.discussionId, appointmentId: input.appointmentId, score: input.score, feedback: input.feedback?.trim() || null } });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('You have already rated this counselling session.');
      throw error;
    }
  }
  listMine(userId: string) { return this.prisma.counsellorRating.findMany({ where: { authorId: userId }, select: { id: true, discussionId: true, appointmentId: true, score: true, moderationStatus: true, createdAt: true } }); }
  listPending() {
    return this.prisma.counsellorRating.findMany({ where: { moderationStatus: 'PENDING' }, orderBy: { createdAt: 'asc' }, include: {
      author: { select: { id: true, displayName: true, email: true } },
      counsellor: { include: { user: { select: { id: true, displayName: true, email: true } } } },
      discussion: { select: { id: true, title: true } }, appointment: { select: { id: true, startsAt: true } },
    } });
  }
  async moderate(actor: AuthenticatedUser, id: string, status: 'APPROVED' | 'REJECTED') {
    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException('Administrator access is required.');
    const rating = await this.prisma.counsellorRating.findUnique({ where: { id } });
    if (!rating) throw new NotFoundException('Rating not found.');
    // Status, aggregate, audit entry and notification commit together so the displayed average can never disagree with the approved ratings.
    return this.prisma.$transaction(async tx => {
      const updated = await tx.counsellorRating.update({ where: { id }, data: { moderationStatus: status } });
      const aggregate = await tx.counsellorRating.aggregate({ where: { counsellorId: rating.counsellorId, moderationStatus: 'APPROVED' }, _avg: { score: true }, _count: { _all: true } });
      const counsellor = await tx.counsellorProfile.update({ where: { id: rating.counsellorId }, data: { averageRating: aggregate._avg.score ?? null, ratingCount: aggregate._count._all }, select: { userId: true } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'COUNSELLOR_RATING_MODERATED', entityType: 'CounsellorRating', entityId: id, metadata: { status } } });
      if (status === 'APPROVED' && rating.moderationStatus !== 'APPROVED') {
        await createNotification(tx, counsellor.userId, 'New rating published', `A member rated a session ${rating.score} out of 5.`, 'RATING');
      }
      return updated;
    });
  }
}
