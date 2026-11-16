import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, CounsellorAvailability, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { createNotification } from '../notifications/notifications.service';
import { ACTIVE_DISCUSSION_STATUSES, MAX_ACTIVE_DISCUSSIONS } from '../discussions/assignment.util';

const MIN_MINUTES = 15;
const MAX_MINUTES = 120;

/** Statuses that occupy a slot in a counsellor's or member's calendar. */
export const OPEN_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.REQUESTED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULED,
];

/** Pure validation of a requested time window. Exported so the rules can be unit tested. */
export function parseAppointmentWindow(startsAtInput: string, endsAtInput: string, now: Date = new Date()): { startsAt: Date; endsAt: Date } {
  const startsAt = new Date(startsAtInput);
  const endsAt = new Date(endsAtInput);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt <= now || endsAt <= startsAt) {
    throw new BadRequestException('Choose a valid future appointment time.');
  }
  const minutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
  if (minutes < MIN_MINUTES) throw new BadRequestException('An appointment must be at least 15 minutes long.');
  if (minutes > MAX_MINUTES) throw new BadRequestException('An appointment cannot exceed two hours.');
  return { startsAt, endsAt };
}

/** Allowed status moves. Rescheduling is a separate action because it changes the time. */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.REQUESTED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.RESCHEDULED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NO_SHOW]: [],
};

const label = (status: string) => status.toLowerCase().replaceAll('_', ' ');

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const where: Prisma.AppointmentWhereInput =
      user.role === UserRole.MEMBER ? { memberId: user.id } : user.role === UserRole.COUNSELLOR ? { counsellor: { userId: user.id } } : {};
    return this.prisma.appointment.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        member: { select: { id: true, displayName: true } },
        counsellor: { include: { user: { select: { id: true, displayName: true } } } },
        topic: { select: { id: true, name: true } },
      },
    });
  }

  async create(user: AuthenticatedUser, input: { topicId: string; startsAt: string; endsAt: string; notes?: string }) {
    if (user.role !== UserRole.MEMBER) throw new ForbiddenException('Only member accounts can request appointments.');
    const { startsAt, endsAt } = parseAppointmentWindow(input.startsAt, input.endsAt);

    const topic = await this.prisma.counsellingTopic.findFirst({ where: { id: input.topicId, isActive: true }, select: { id: true, name: true } });
    if (!topic) throw new BadRequestException('The selected counselling topic is unavailable.');

    return this.prisma.$transaction(
      async (tx) => {
        const memberClash = await tx.appointment.count({ where: { memberId: user.id, status: { in: OPEN_APPOINTMENT_STATUSES }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
        if (memberClash) throw new BadRequestException('You already have an appointment at that time.');

        const eligible = await tx.counsellorProfile.findMany({
          where: { availability: CounsellorAvailability.AVAILABLE, topics: { some: { topicId: topic.id } }, user: { status: 'ACTIVE' } },
          select: { id: true },
        });

        const choices: { id: string; active: number; load: number }[] = [];
        for (const profile of eligible) {
          const [overlap, active, load] = await Promise.all([
            tx.appointment.count({ where: { counsellorId: profile.id, status: { in: OPEN_APPOINTMENT_STATUSES }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }),
            tx.discussionAssignment.count({ where: { counsellorId: profile.id, releasedAt: null, discussion: { status: { in: ACTIVE_DISCUSSION_STATUSES } } } }),
            tx.appointment.count({ where: { counsellorId: profile.id, status: { in: OPEN_APPOINTMENT_STATUSES }, startsAt: { gte: new Date() } } }),
          ]);
          if (!overlap && active < MAX_ACTIVE_DISCUSSIONS) choices.push({ id: profile.id, active, load });
        }
        choices.sort((a, b) => a.active - b.active || a.load - b.load);
        const chosen = choices[0];
        if (!chosen) throw new BadRequestException('No counsellor is available for that topic and time. Choose another time or topic.');

        const appointment = await tx.appointment.create({
          data: { memberId: user.id, counsellorId: chosen.id, topicId: topic.id, startsAt, endsAt, notes: input.notes?.trim() || null, status: AppointmentStatus.REQUESTED },
          include: { topic: true, counsellor: { include: { user: { select: { id: true, displayName: true } } } } },
        });

        await createNotification(tx, appointment.counsellor.user.id, 'New appointment request', `A member requested a ${topic.name} appointment. Open your workspace to confirm it.`, 'APPOINTMENT');
        await createNotification(tx, user.id, 'Appointment requested', `Your ${topic.name} appointment request was sent to ${appointment.counsellor.user.displayName || 'a counsellor'}. You will be notified when it is confirmed.`, 'APPOINTMENT');
        await tx.auditLog.create({ data: { actorId: user.id, action: 'APPOINTMENT_REQUESTED', entityType: 'Appointment', entityId: appointment.id } });
        return appointment;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  /** Moves an upcoming appointment to a new time with the same counsellor. The other party must confirm the new time. */
  async reschedule(user: AuthenticatedUser, id: string, input: { startsAt: string; endsAt: string }) {
    const { startsAt, endsAt } = parseAppointmentWindow(input.startsAt, input.endsAt);
    const appointment = await this.prisma.appointment.findUnique({ where: { id }, include: { counsellor: { select: { id: true, userId: true, availability: true, user: { select: { status: true } } } }, topic: { select: { name: true } } } });
    if (!appointment) throw new NotFoundException('Appointment not found.');

    const isMember = appointment.memberId === user.id;
    const isCounsellor = appointment.counsellor.userId === user.id;
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isMember && !isCounsellor && !isAdmin) throw new ForbiddenException('You do not have access to this appointment.');
    if (!OPEN_APPOINTMENT_STATUSES.includes(appointment.status)) throw new BadRequestException(`A ${label(appointment.status)} appointment cannot be rescheduled.`);
    if (appointment.startsAt <= new Date()) throw new BadRequestException('This appointment has already started and cannot be rescheduled.');
    const unavailable: CounsellorAvailability[] = [CounsellorAvailability.OFFLINE, CounsellorAvailability.ON_LEAVE, CounsellorAvailability.SUSPENDED];
    if (appointment.counsellor.user.status !== 'ACTIVE' || unavailable.includes(appointment.counsellor.availability)) {
      throw new BadRequestException('The counsellor is not taking appointments right now. Cancel this request and book a new one.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const counsellorClash = await tx.appointment.count({ where: { id: { not: id }, counsellorId: appointment.counsellor.id, status: { in: OPEN_APPOINTMENT_STATUSES }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
        if (counsellorClash) throw new BadRequestException('The counsellor is not free at that time. Choose another time.');
        const memberClash = await tx.appointment.count({ where: { id: { not: id }, memberId: appointment.memberId, status: { in: OPEN_APPOINTMENT_STATUSES }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
        if (memberClash) throw new BadRequestException('The member already has an appointment at that time.');

        const updated = await tx.appointment.update({
          where: { id },
          data: { startsAt, endsAt, status: AppointmentStatus.RESCHEDULED, rescheduledById: user.id, rescheduledAt: new Date() },
          include: {
            member: { select: { id: true, displayName: true } },
            counsellor: { include: { user: { select: { id: true, displayName: true } } } },
            topic: { select: { id: true, name: true } },
          },
        });
        const topicName = appointment.topic?.name || 'counselling';
        // The party who did not propose the change is the one who must respond.
        const recipients = isMember ? [appointment.counsellor.userId] : [appointment.memberId, ...(isAdmin && !isCounsellor ? [appointment.counsellor.userId] : [])];
        for (const recipientId of new Set(recipients)) {
          if (recipientId !== user.id) await createNotification(tx, recipientId, 'Appointment time changed', `A new time was proposed for your ${topicName} appointment. Open Appointments to confirm it or cancel.`, 'APPOINTMENT');
        }
        await tx.auditLog.create({ data: { actorId: user.id, action: 'APPOINTMENT_RESCHEDULED', entityType: 'Appointment', entityId: id, metadata: { from: appointment.startsAt.toISOString(), to: startsAt.toISOString() } } });
        return updated;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: AppointmentStatus) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id }, include: { counsellor: true } });
    if (!appointment) throw new NotFoundException('Appointment not found.');

    const isMember = appointment.memberId === user.id;
    const isCounsellor = appointment.counsellor.userId === user.id;
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isMember && !isCounsellor && !isAdmin) throw new ForbiddenException('You do not have access to this appointment.');

    if (!APPOINTMENT_TRANSITIONS[appointment.status].includes(status)) {
      throw new BadRequestException(`An appointment cannot move from ${label(appointment.status)} to ${label(status)}.`);
    }

    // The person who proposed a new time cannot also approve it.
    const proposedByActor = appointment.status === AppointmentStatus.RESCHEDULED && appointment.rescheduledById === user.id;
    if (isMember && !isAdmin) {
      const isMemberApproval = status === AppointmentStatus.CONFIRMED && appointment.status === AppointmentStatus.RESCHEDULED && !proposedByActor;
      if (status !== AppointmentStatus.CANCELLED && !isMemberApproval) throw new ForbiddenException('Members can cancel their appointments or confirm a time proposed by their counsellor.');
    }
    if (isCounsellor && !isAdmin) {
      if (status === AppointmentStatus.CANCELLED) throw new BadRequestException('Counsellors cannot cancel member appointment requests. Propose a new time instead.');
      if (status === AppointmentStatus.CONFIRMED && proposedByActor) throw new BadRequestException('The member must confirm a time you proposed.');
    }

    if (status === AppointmentStatus.CONFIRMED && appointment.startsAt <= new Date()) {
      throw new BadRequestException('This appointment time has passed. Propose a new time or cancel it.');
    }
    const finalStatuses: AppointmentStatus[] = [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW];
    if (finalStatuses.includes(status) && appointment.startsAt > new Date()) {
      throw new BadRequestException('An appointment cannot be completed or marked as no-show before its scheduled start time.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Guarding on the status we read makes two simultaneous updates safe: the second one matches nothing.
      const moved = await tx.appointment.updateMany({ where: { id, status: appointment.status }, data: { status, completedAt: status === AppointmentStatus.COMPLETED ? new Date() : null } });
      if (moved.count !== 1) throw new BadRequestException('This appointment was just updated. Refresh and try again.');
      const updated = await tx.appointment.findUniqueOrThrow({
        where: { id },
        include: { member: { select: { id: true, displayName: true } }, counsellor: { include: { user: { select: { id: true, displayName: true } } } }, topic: { select: { id: true, name: true } } },
      });

      const topicName = updated.topic?.name || 'counselling';
      const recipients = isMember ? [updated.counsellor.userId] : isCounsellor ? [updated.member.id] : [updated.member.id, updated.counsellor.userId];
      for (const recipientId of new Set(recipients)) {
        if (recipientId !== user.id) await createNotification(tx, recipientId, 'Appointment updated', `Your ${topicName} appointment is now ${label(status)}.`, 'APPOINTMENT');
      }
      await tx.auditLog.create({ data: { actorId: user.id, action: 'APPOINTMENT_STATUS_CHANGED', entityType: 'Appointment', entityId: id, metadata: { from: appointment.status, to: status } } });
      return updated;
    });
  }
}
