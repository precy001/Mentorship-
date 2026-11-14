
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  CounsellorAvailability,
  DiscussionStatus,
  UserRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const where: Prisma.AppointmentWhereInput =
      user.role === UserRole.MEMBER
        ? { memberId: user.id }
        : user.role === UserRole.COUNSELLOR
          ? { counsellor: { userId: user.id } }
          : {};

    return this.prisma.appointment.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        member: { select: { id: true, displayName: true } },
        counsellor: {
          include: {
            user: { select: { id: true, displayName: true } },
          },
        },
        topic: { select: { id: true, name: true } },
      },
    });
  }

  async create(
    user: AuthenticatedUser,
    input: {
      topicId: string;
      startsAt: string;
      endsAt: string;
      notes?: string;
    },
  ) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException(
        'Only member accounts can request appointments.',
      );
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      startsAt <= new Date() ||
      endsAt <= startsAt
    ) {
      throw new BadRequestException(
        'Choose a valid future appointment time.',
      );
    }

    if (endsAt.getTime() - startsAt.getTime() < 15 * 60 * 1000) {
      throw new BadRequestException(
        'An appointment must be at least 15 minutes long.',
      );
    }

    if (endsAt.getTime() - startsAt.getTime() > 2 * 60 * 60 * 1000) {
      throw new BadRequestException(
        'An appointment cannot exceed two hours.',
      );
    }

    const topic = await this.prisma.counsellingTopic.findFirst({
      where: { id: input.topicId, isActive: true },
      select: { id: true, name: true },
    });

    if (!topic) {
      throw new BadRequestException(
        'The selected counselling topic is unavailable.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const eligible = await tx.counsellorProfile.findMany({
          where: {
            availability: CounsellorAvailability.AVAILABLE,
            topics: { some: { topicId: topic.id } },
            user: { status: 'ACTIVE' },
          },
          select: { id: true },
        });

        const choices: { id: string; active: number; load: number }[] = [];

        for (const profile of eligible) {
          const [overlap, active, load] = await Promise.all([
            tx.appointment.count({
              where: {
                counsellorId: profile.id,
                status: {
                  in: [
                    AppointmentStatus.REQUESTED,
                    AppointmentStatus.CONFIRMED,
                    AppointmentStatus.RESCHEDULED,
                  ],
                },
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt },
              },
            }),
            tx.discussionAssignment.count({
              where: {
                counsellorId: profile.id,
                releasedAt: null,
                discussion: {
                  status: {
                    in: [
                      DiscussionStatus.ASSIGNED,
                      DiscussionStatus.IN_PROGRESS,
                      DiscussionStatus.WAITING_FOR_MEMBER,
                    ],
                  },
                },
              },
            }),
            tx.appointment.count({
              where: {
                counsellorId: profile.id,
                status: {
                  in: [
                    AppointmentStatus.REQUESTED,
                    AppointmentStatus.CONFIRMED,
                    AppointmentStatus.RESCHEDULED,
                  ],
                },
                startsAt: { gte: new Date() },
              },
            }),
          ]);

          if (!overlap && active < 5) {
            choices.push({ id: profile.id, active, load });
          }
        }

        choices.sort(
          (a, b) => a.active - b.active || a.load - b.load,
        );

        if (!choices[0]) {
          throw new BadRequestException(
            'No counsellor is available for that topic and time. Choose another time or topic.',
          );
        }

        const appointment = await tx.appointment.create({
          data: {
            memberId: user.id,
            counsellorId: choices[0].id,
            topicId: topic.id,
            startsAt,
            endsAt,
            notes: input.notes?.trim() || null,
            status: AppointmentStatus.REQUESTED,
          },
          include: {
            topic: true,
            counsellor: {
              include: {
                user: { select: { displayName: true } },
              },
            },
          },
        });

        const counsellorUser = await tx.counsellorProfile.findUnique({
          where: { id: choices[0].id },
          select: { userId: true },
        });

        if (counsellorUser) {
          await tx.userNotification.create({
            data: {
              userId: counsellorUser.userId,
              title: 'New appointment request',
              body: `A member requested a ${topic.name} appointment. Open your workspace to view the scheduled time.`,
              type: 'APPOINTMENT',
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'APPOINTMENT_REQUESTED',
            entityType: 'Appointment',
            entityId: appointment.id,
          },
        });

        return appointment;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    status: AppointmentStatus,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { counsellor: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }

    const isMember = appointment.memberId === user.id;
    const isCounsellor = appointment.counsellor.userId === user.id;
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

    if (!isMember && !isCounsellor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have access to this appointment.',
      );
    }

    if (isMember && status !== AppointmentStatus.CANCELLED) {
      throw new ForbiddenException(
        'Members can only cancel their own appointment requests.',
      );
    }

    if (
      isCounsellor &&
      !isAdmin &&
      status === AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Counsellors cannot cancel member appointment requests.',
      );
    }

    const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.REQUESTED]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.RESCHEDULED]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.COMPLETED]: [],
      [AppointmentStatus.CANCELLED]: [],
      [AppointmentStatus.NO_SHOW]: [],
    };

    if (!transitions[appointment.status].includes(status)) {
      throw new BadRequestException(
        `An appointment cannot move from ${appointment.status
          .toLowerCase()
          .replace('_', ' ')} to ${status.toLowerCase().replace('_', ' ')}.`,
      );
    }

    const finalStatuses: AppointmentStatus[] = [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
    ];

    if (
      isCounsellor &&
      !isAdmin &&
      finalStatuses.includes(status) &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only confirmed appointments can be completed or marked as no-show.',
      );
    }

    if (
      finalStatuses.includes(status) &&
      appointment.startsAt > new Date()
    ) {
      throw new BadRequestException(
        'An appointment cannot be completed or marked as no-show before its scheduled start time.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status,
          completedAt:
            status === AppointmentStatus.COMPLETED ? new Date() : null,
        },
        include: {
          member: { select: { id: true } },
          counsellor: { select: { userId: true } },
          topic: { select: { name: true } },
        },
      });

      const notifyUserId = isMember
        ? updated.counsellor.userId
        : updated.member.id;

      await tx.userNotification.create({
        data: {
          userId: notifyUserId,
          title: 'Appointment updated',
          body: `Your ${updated.topic?.name || 'counselling'} appointment status is now ${status
            .toLowerCase()
            .replace('_', ' ')}.`,
          type: 'APPOINTMENT',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'APPOINTMENT_STATUS_CHANGED',
          entityType: 'Appointment',
          entityId: id,
          metadata: { status },
        },
      });

      return updated;
    });
  }
}
