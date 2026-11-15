import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, CounsellorAvailability, DiscussionStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { StorageService, type UploadableImage } from '../storage/storage.service';
import { ServiceAreasService } from '../service-areas/service-areas.service';
import { CONTENT_IMAGE_FOLDER } from '../content/content.constants';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService, private readonly config: ConfigService, private readonly storage: StorageService, private readonly serviceAreas: ServiceAreasService) {}

  async listResources(includeInactive = true) {
    return this.prisma.resource.findMany({ where: includeInactive ? {} : { isActive: true }, orderBy: { createdAt: 'desc' } });
  }
  async uploadContentImage(actorId: string, file: UploadableImage) {
    const { url } = await this.storage.uploadImage(CONTENT_IMAGE_FOLDER, file, 'Image uploads are not configured on the server. Contact the platform owner.');
    await this.audit(actorId, 'CONTENT_IMAGE_UPLOADED', 'ContentImage', null, { url });
    return { imageUrl: url };
  }

  /** Accepts only images uploaded through uploadContentImage(); returns null for "no image". */
  private managedImageUrl(value: string | null | undefined): string | null {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return null;
    if (!this.storage.isManagedUrl(url, CONTENT_IMAGE_FOLDER)) throw new BadRequestException('The image must be uploaded through Mentorship+ before it can be attached.');
    return url;
  }

  async createResource(actorId: string, input: { title: string; category: string; readTime?: string; description: string; imageUrl?: string | null }) {
    const imageUrl = this.managedImageUrl(input.imageUrl);
    const resource = await this.prisma.resource.create({ data: { title: input.title.trim(), category: input.category.trim(), readTime: input.readTime?.trim() || '5 min read', description: input.description.trim(), imageUrl } });
    await this.audit(actorId, 'RESOURCE_CREATED', 'Resource', resource.id);
    return resource;
  }
  async updateResource(actorId: string, id: string, input: { title: string; category: string; readTime?: string; description: string; imageUrl?: string | null }) {
    const existing = await this.prisma.resource.findUnique({ where: { id }, select: { id: true, imageUrl: true } });
    if (!existing) throw new NotFoundException('Resource not found.');
    const imageUrl = input.imageUrl === undefined ? undefined : this.managedImageUrl(input.imageUrl);
    const resource = await this.prisma.resource.update({ where: { id }, data: {
      title: input.title.trim(), category: input.category.trim(), description: input.description.trim(),
      ...(input.readTime?.trim() ? { readTime: input.readTime.trim() } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    } });
    await this.audit(actorId, 'RESOURCE_UPDATED', 'Resource', id);
    if (imageUrl !== undefined && existing.imageUrl && existing.imageUrl !== imageUrl) void this.storage.deleteByUrl(existing.imageUrl);
    return resource;
  }
  async deleteResource(actorId: string, id: string) {
    const existing = await this.prisma.resource.findUnique({ where: { id }, select: { id: true, imageUrl: true } });
    if (!existing) throw new NotFoundException('Resource not found.');
    await this.prisma.resource.delete({ where: { id } });
    await this.audit(actorId, 'RESOURCE_DELETED', 'Resource', id);
    void this.storage.deleteByUrl(existing.imageUrl);
    return { success: true };
  }
  async setResourceActive(actorId: string, id: string, isActive: boolean) {
    const resource = await this.prisma.resource.update({ where: { id }, data: { isActive } }).catch(() => null);
    if (!resource) throw new NotFoundException('Resource not found.');
    await this.audit(actorId, isActive ? 'RESOURCE_PUBLISHED' : 'RESOURCE_UNPUBLISHED', 'Resource', id);
    return resource;
  }
  async listScholarships(includeInactive = true) {
    return this.prisma.scholarship.findMany({ where: includeInactive ? {} : { isActive: true }, orderBy: { deadline: 'asc' } });
  }
  private parseDeadline(value: string): Date {
    const deadline = new Date(value);
    if (!Number.isFinite(deadline.getTime())) throw new BadRequestException('Enter a valid scholarship deadline.');
    return deadline;
  }
  async createScholarship(actorId: string, input: { title: string; provider: string; level: string; deadline: string; eligibility: string; description: string; imageUrl?: string | null }) {
    const deadline = this.parseDeadline(input.deadline);
    if (deadline.getTime() <= Date.now()) throw new BadRequestException('The scholarship deadline must be in the future.');
    const imageUrl = this.managedImageUrl(input.imageUrl);
    const scholarship = await this.prisma.scholarship.create({ data: { title: input.title.trim(), provider: input.provider.trim(), level: input.level.trim(), deadline, eligibility: input.eligibility.trim(), description: input.description.trim(), imageUrl } });
    await this.audit(actorId, 'SCHOLARSHIP_CREATED', 'Scholarship', scholarship.id);
    return scholarship;
  }
  async updateScholarship(actorId: string, id: string, input: { title: string; provider: string; level: string; deadline: string; eligibility: string; description: string; imageUrl?: string | null }) {
    const existing = await this.prisma.scholarship.findUnique({ where: { id }, select: { id: true, deadline: true, imageUrl: true } });
    if (!existing) throw new NotFoundException('Scholarship not found.');
    const deadline = this.parseDeadline(input.deadline);
    // An already-expired listing can still be corrected; only a *changed* deadline must lie in the future.
    if (deadline.getTime() !== existing.deadline.getTime() && deadline.getTime() <= Date.now()) throw new BadRequestException('The scholarship deadline must be in the future.');
    const imageUrl = input.imageUrl === undefined ? undefined : this.managedImageUrl(input.imageUrl);
    const scholarship = await this.prisma.scholarship.update({ where: { id }, data: {
      title: input.title.trim(), provider: input.provider.trim(), level: input.level.trim(), deadline,
      eligibility: input.eligibility.trim(), description: input.description.trim(),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    } });
    await this.audit(actorId, 'SCHOLARSHIP_UPDATED', 'Scholarship', id);
    if (imageUrl !== undefined && existing.imageUrl && existing.imageUrl !== imageUrl) void this.storage.deleteByUrl(existing.imageUrl);
    return scholarship;
  }
  async deleteScholarship(actorId: string, id: string) {
    const existing = await this.prisma.scholarship.findUnique({ where: { id }, select: { id: true, imageUrl: true } });
    if (!existing) throw new NotFoundException('Scholarship not found.');
    await this.prisma.scholarship.delete({ where: { id } });
    await this.audit(actorId, 'SCHOLARSHIP_DELETED', 'Scholarship', id);
    void this.storage.deleteByUrl(existing.imageUrl);
    return { success: true };
  }
  async setScholarshipActive(actorId: string, id: string, isActive: boolean) {
    const scholarship = await this.prisma.scholarship.update({ where: { id }, data: { isActive } }).catch(() => null);
    if (!scholarship) throw new NotFoundException('Scholarship not found.');
    await this.audit(actorId, isActive ? 'SCHOLARSHIP_PUBLISHED' : 'SCHOLARSHIP_UNPUBLISHED', 'Scholarship', id);
    return scholarship;
  }
  async listServiceAreas() { return this.serviceAreas.listAll(); }
  async createServiceArea(actorId: string, input: { state: string; lga: string; lcda: string }) {
    const area = await this.serviceAreas.create(input);
    await this.audit(actorId, 'SERVICE_AREA_CREATED', 'ServiceArea', area.id, { lga: area.lga, lcda: area.lcda });
    return area;
  }
  async updateServiceArea(actorId: string, id: string, input: { state: string; lga: string; lcda: string }) {
    const area = await this.serviceAreas.update(id, input);
    await this.audit(actorId, 'SERVICE_AREA_UPDATED', 'ServiceArea', id, { lga: area.lga, lcda: area.lcda });
    return area;
  }
  async setServiceAreaActive(actorId: string, id: string, isActive: boolean) {
    const area = await this.serviceAreas.setActive(id, isActive);
    await this.audit(actorId, isActive ? 'SERVICE_AREA_ENABLED' : 'SERVICE_AREA_DISABLED', 'ServiceArea', id);
    return area;
  }
  async setLgaActive(actorId: string, state: string, lga: string, isActive: boolean) {
    const result = await this.serviceAreas.setLgaActive(state, lga, isActive);
    await this.audit(actorId, isActive ? 'LGA_ENABLED' : 'LGA_DISABLED', 'ServiceArea', null, { state, lga, updated: result.updated });
    return result;
  }
  async renameLga(actorId: string, state: string, lga: string, newLga: string) {
    const result = await this.serviceAreas.renameLga(state, lga, newLga);
    await this.audit(actorId, 'LGA_RENAMED', 'ServiceArea', null, { state, from: lga, to: newLga, updated: result.updated });
    return result;
  }
  async deleteServiceArea(actorId: string, id: string) {
    const result = await this.serviceAreas.remove(id);
    await this.audit(actorId, 'SERVICE_AREA_DELETED', 'ServiceArea', id);
    return result;
  }

  async dashboard() {
    const [users, members, counsellors, admins, topics, openDiscussions, appointments, pendingRatings, resources, scholarships] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.MEMBER, status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { role: UserRole.COUNSELLOR, status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }, status: UserStatus.ACTIVE } }),
      this.prisma.counsellingTopic.count({ where: { isActive: true } }),
      this.prisma.discussion.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_MEMBER'] } } }),
      this.prisma.appointment.count({ where: { status: { in: ['REQUESTED', 'CONFIRMED', 'RESCHEDULED'] } } }),
      this.prisma.counsellorRating.count({ where: { moderationStatus: 'PENDING' } }),
      this.prisma.resource.count({ where: { isActive: true } }),
      this.prisma.scholarship.count({ where: { isActive: true } }),
    ]);
    return { users, members, counsellors, admins, topics, openDiscussions, appointments, pendingRatings, resources, scholarships };
  }

  async listUsers(query = '') {
    const search = query.trim();
    return this.prisma.user.findMany({
      where: search ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { displayName: { contains: search, mode: 'insensitive' } }] } : {},
      orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, email: true, displayName: true, role: true, status: true, emailVerifiedAt: true, createdAt: true,
        counsellorProfile: { select: { availability: true, averageRating: true, ratingCount: true, topics: { include: { topic: { select: { id: true, name: true } } } } } },
        profile: { select: { category: { select: { name: true } }, subcategory: { select: { name: true } } } } },
    });
  }

  private async releaseCounsellorWork(tx: Prisma.TransactionClient, counsellorId: string, reason: string) {
    const activeAssignments = await tx.discussionAssignment.findMany({ where: { counsellorId, releasedAt: null, discussion: { status: { in: [DiscussionStatus.ASSIGNED, DiscussionStatus.IN_PROGRESS, DiscussionStatus.WAITING_FOR_MEMBER] } } }, select: { discussionId: true } });
    if (activeAssignments.length) {
      const discussionIds = [...new Set(activeAssignments.map(item => item.discussionId))];
      await tx.discussion.updateMany({ where: { id: { in: discussionIds } }, data: { status: DiscussionStatus.REASSIGNMENT_REQUIRED } });
      await tx.discussionAssignment.updateMany({ where: { counsellorId, discussionId: { in: discussionIds }, releasedAt: null }, data: { releasedAt: new Date(), releaseReason: reason } });
    }
    const affectedAppointments = await tx.appointment.findMany({ where: { counsellorId, status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED] } }, select: { id: true, memberId: true, topic: { select: { name: true } } } });
    if (affectedAppointments.length) {
      await tx.appointment.updateMany({ where: { id: { in: affectedAppointments.map(item => item.id) } }, data: { status: AppointmentStatus.CANCELLED } });
      for (const appointment of affectedAppointments) {
        await tx.userNotification.create({ data: { userId: appointment.memberId, title: 'Appointment cancelled', body: `Your ${appointment.topic?.name || 'counselling'} appointment was cancelled because the assigned counsellor is no longer available. Please request another session.`, type: 'APPOINTMENT' } });
      }
    }
    await tx.counsellorProfile.update({ where: { id: counsellorId }, data: { availability: CounsellorAvailability.OFFLINE } });
  }

  async setRole(actor: AuthenticatedUser, userId: string, role: UserRole) {
    const target = await this.prisma.user.findUnique({ where: { id: userId }, include: { counsellorProfile: true } });
    if (!target) throw new NotFoundException('Account not found.');
    if (target.id === actor.id) throw new BadRequestException('You cannot change your own role.');
    if (actor.role !== 'SUPER_ADMIN' && (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || target.role === UserRole.ADMIN || target.role === UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Only a Super Admin can appoint or change administrator accounts.');
    }
    if (target.role === UserRole.SUPER_ADMIN && actor.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only a Super Admin can manage this account.');
    return this.prisma.$transaction(async tx => {
      const updated = await tx.user.update({ where: { id: userId }, data: { role }, select: { id: true, email: true, displayName: true, role: true, status: true } });
      if (role === UserRole.COUNSELLOR) {
        await tx.counsellorProfile.upsert({ where: { userId }, create: { userId, availability: CounsellorAvailability.OFFLINE }, update: {} });
      } else if (target.counsellorProfile) {
        // Preserve history, release active work and let an administrator reassign affected discussions.
        await this.releaseCounsellorWork(tx, target.counsellorProfile.id, 'COUNSELLOR_ROLE_REVOKED');
      }
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'USER_ROLE_CHANGED', entityType: 'User', entityId: userId, metadata: { from: target.role, to: role } } });
      return updated;
    });
  }

  async setAccountStatus(actor: AuthenticatedUser, userId: string, status: UserStatus) {
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true, emailVerifiedAt: true } });
    if (!target) throw new NotFoundException('Account not found.');
    if (status === UserStatus.ACTIVE && !target.emailVerifiedAt) throw new BadRequestException('The account email must be verified before the account can be activated.');
    if (target.id === actor.id) throw new BadRequestException('You cannot change your own account status.');
    if ((target.role === UserRole.ADMIN || target.role === UserRole.SUPER_ADMIN) && actor.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException('Only a Super Admin can change an administrator account status.');
    return this.prisma.$transaction(async tx => {
      if (status !== UserStatus.ACTIVE && target.role === UserRole.COUNSELLOR) {
        const profile = await tx.counsellorProfile.findUnique({ where: { userId }, select: { id: true } });
        if (profile) await this.releaseCounsellorWork(tx, profile.id, 'COUNSELLOR_ACCOUNT_DISABLED');
      }
      const updated = await tx.user.update({ where: { id: userId }, data: { status }, select: { id: true, email: true, role: true, status: true } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'USER_STATUS_CHANGED', entityType: 'User', entityId: userId, metadata: { from: target.status, to: status } } });
      return updated;
    });
  }

  async inviteCounsellor(actor: AuthenticatedUser, emailInput: string, topicIds: string[]) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (user && user.role !== UserRole.MEMBER && user.role !== UserRole.COUNSELLOR) throw new ConflictException('This email belongs to an administrator account.');
    const uniqueTopicIds = [...new Set(topicIds)];
    const topics = await this.prisma.counsellingTopic.findMany({ where: { id: { in: uniqueTopicIds }, isActive: true }, select: { id: true } });
    if (!uniqueTopicIds.length || topics.length !== uniqueTopicIds.length) throw new BadRequestException('Select at least one valid active counselling topic.');
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.counsellorInvitation.updateMany({ where: { email, acceptedAt: null }, data: { acceptedAt: new Date() } });
    await this.prisma.counsellorInvitation.create({ data: { email, tokenHash, topicIds: uniqueTopicIds, invitedById: actor.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    const base = (this.config.get<string>('AUTH_COUNSELLOR_INVITATION_URL') || 'guidanceplus://counsellor-invite').replace(/\/$/, '');
    const actionUrl = `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(rawToken)}`;
    try {
      await this.mail.sendActionEmail(email, 'Your Mentorship+ counsellor invitation', actionUrl, 'invite');
    } catch (error) {
      await this.prisma.counsellorInvitation.updateMany({ where: { tokenHash, acceptedAt: null }, data: { acceptedAt: new Date() } });
      throw error;
    }
    await this.prisma.auditLog.create({ data: { actorId: actor.id, action: 'COUNSELLOR_INVITED', entityType: 'CounsellorInvitation', entityId: email, metadata: { topicIds: uniqueTopicIds } } });
    return { message: 'Counsellor invitation sent. It expires in seven days.' };
  }

  async acceptCounsellorInvitation(user: AuthenticatedUser, rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invitation = await this.prisma.counsellorInvitation.findUnique({ where: { tokenHash } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) throw new BadRequestException('This invitation is invalid, expired or already used.');
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) throw new ForbiddenException('Sign in with the email address this invitation was sent to.');
    const topicIds = Array.isArray(invitation.topicIds) ? invitation.topicIds.filter((id): id is string => typeof id === 'string') : [];
    const validTopics = await this.prisma.counsellingTopic.findMany({ where: { id: { in: topicIds }, isActive: true }, select: { id: true } });
    if (!topicIds.length || validTopics.length !== topicIds.length) throw new BadRequestException('The invitation topics are no longer available. Contact an administrator.');
    return this.prisma.$transaction(async tx => {
      const consumed = await tx.counsellorInvitation.updateMany({ where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
      if (consumed.count !== 1) throw new BadRequestException('This invitation has already been used or expired.');
      const updated = await tx.user.update({ where: { id: user.id }, data: { role: UserRole.COUNSELLOR }, select: { id: true, email: true, role: true } });
      const profile = await tx.counsellorProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, availability: CounsellorAvailability.OFFLINE }, update: {} });
      await tx.counsellorTopicAssignment.deleteMany({ where: { counsellorId: profile.id } });
      await tx.counsellorTopicAssignment.createMany({ data: topicIds.map(topicId => ({ counsellorId: profile.id, topicId, assignedById: invitation.invitedById })) });
      await tx.auditLog.create({ data: { actorId: user.id, action: 'COUNSELLOR_INVITATION_ACCEPTED', entityType: 'User', entityId: user.id, metadata: { invitedById: invitation.invitedById, topicIds } } });
      return updated;
    });
  }

  async listAppointments() {
    return this.prisma.appointment.findMany({ orderBy: { startsAt: 'desc' }, take: 100, include: {
      member: { select: { id: true, displayName: true, email: true } },
      counsellor: { include: { user: { select: { id: true, displayName: true, email: true } } } },
      topic: { select: { id: true, name: true } },
    } });
  }
  async listAuditLogs() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { actor: { select: { id: true, displayName: true, email: true, role: true } } } });
  }

  async listUnassignedDiscussions() {
    return this.prisma.discussion.findMany({ where: { status: { in: ['OPEN', 'REASSIGNMENT_REQUIRED'] }, assignments: { none: { releasedAt: null } } }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }], include: { topic: { select: { id: true, name: true } }, creator: { select: { id: true, displayName: true, email: true } }, _count: { select: { messages: true } } } });
  }

  async autoAssignDiscussion(actor: AuthenticatedUser, discussionId: string) {
    const discussion = await this.prisma.discussion.findUnique({ where: { id: discussionId }, include: { topic: true } });
    if (!discussion || ![ 'OPEN', 'REASSIGNMENT_REQUIRED' ].includes(discussion.status)) throw new NotFoundException('An assignable discussion was not found.');
    return this.prisma.$transaction(async tx => {
      const eligible = await tx.counsellorProfile.findMany({ where: { availability: CounsellorAvailability.AVAILABLE, topics: { some: { topicId: discussion.topicId } }, user: { status: UserStatus.ACTIVE } }, select: { id: true } });
      const candidates: { id: string; active: number; appointmentLoad: number }[] = [];
      for (const item of eligible) {
        const [active, appointmentLoad] = await Promise.all([
          tx.discussionAssignment.count({ where: { counsellorId: item.id, releasedAt: null, discussion: { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_MEMBER'] } } } }),
          tx.appointment.count({ where: { counsellorId: item.id, status: { in: ['REQUESTED', 'CONFIRMED', 'RESCHEDULED'] }, startsAt: { gte: new Date() } } }),
        ]);
        if (active < 5) candidates.push({ id: item.id, active, appointmentLoad });
      }
      candidates.sort((a, b) => a.active - b.active || a.appointmentLoad - b.appointmentLoad);
      if (!candidates[0]) throw new BadRequestException('No available counsellor is assigned to this topic.');
      const activeAssignment = await tx.discussionAssignment.findFirst({ where: { discussionId, releasedAt: null } });
      if (activeAssignment) throw new ConflictException('This discussion has already been assigned. Refresh the list.');
      const assignment = await tx.discussionAssignment.create({ data: { discussionId, counsellorId: candidates[0].id, assignedByRule: 'ADMIN_MANUAL_AUTO', } });
      await tx.discussion.update({ where: { id: discussionId }, data: { status: 'ASSIGNED' } });
      const counsellor = await tx.counsellorProfile.findUnique({ where: { id: candidates[0].id }, select: { userId: true } });
      if (counsellor) await tx.userNotification.create({ data: { userId: counsellor.userId, title: 'New counselling discussion', body: `A discussion about ${discussion.topic.name} has been assigned to you.`, type: 'DISCUSSION' } });
      await tx.userNotification.create({ data: { userId: discussion.creatorId, title: 'Counsellor assigned', body: `A counsellor has been assigned to your ${discussion.topic.name} discussion.`, type: 'DISCUSSION' } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'DISCUSSION_AUTO_ASSIGNED', entityType: 'Discussion', entityId: discussionId, metadata: { counsellorId: candidates[0].id } } });
      const activeCount = await tx.discussionAssignment.count({ where: { counsellorId: candidates[0].id, releasedAt: null, discussion: { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_MEMBER'] } } } });
      if (activeCount >= 5) await tx.counsellorProfile.update({ where: { id: candidates[0].id }, data: { availability: CounsellorAvailability.BUSY } });
      return assignment;
    }, { isolationLevel: 'Serializable' });
  }

  async listTopics() {
    return this.prisma.counsellingTopic.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { counsellors: true, discussions: true } } } });
  }

  async createTopic(actorId: string, name: string, description?: string) {
    const clean = name.trim();
    const duplicate = await this.prisma.counsellingTopic.findFirst({ where: { name: { equals: clean, mode: 'insensitive' } }, select: { id: true } });
    if (duplicate) throw new ConflictException('A topic with this name already exists.');
    if (clean.length < 2) throw new BadRequestException('Topic name must contain at least two characters.');
    const slug = clean.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 73);
    if (!slug) throw new BadRequestException('Enter a valid topic name.');
    try {
      const topic = await this.prisma.counsellingTopic.create({ data: { slug: `${slug}-${randomUUID().slice(0, 6)}`, name: clean, description: description?.trim() || null } });
      await this.audit(actorId, 'TOPIC_CREATED', 'CounsellingTopic', topic.id);
      return topic;
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('A topic with this name already exists.');
      throw error;
    }
  }

  async setTopicActive(actorId: string, topicId: string, isActive: boolean) {
    const topic = await this.prisma.counsellingTopic.update({ where: { id: topicId }, data: { isActive } }).catch(() => null);
    if (!topic) throw new NotFoundException('Topic not found.');
    await this.audit(actorId, isActive ? 'TOPIC_ACTIVATED' : 'TOPIC_DEACTIVATED', 'CounsellingTopic', topicId);
    return topic;
  }

  async assignTopics(actor: AuthenticatedUser, userId: string, topicIds: string[]) {
    const account = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (account?.role !== UserRole.COUNSELLOR) throw new BadRequestException('Only counsellor accounts can receive topic assignments.');
    const counsellor = await this.prisma.counsellorProfile.findUnique({ where: { userId } });
    if (!counsellor) throw new NotFoundException('Counsellor profile not found. Promote this account to Counsellor first.');
    const topics = await this.prisma.counsellingTopic.findMany({ where: { id: { in: [...new Set(topicIds)] }, isActive: true }, select: { id: true } });
    if (topics.length !== new Set(topicIds).size) throw new BadRequestException('One or more selected topics are invalid or inactive.');
    await this.prisma.$transaction(async tx => {
      await tx.counsellorTopicAssignment.deleteMany({ where: { counsellorId: counsellor.id } });
      if (topicIds.length) await tx.counsellorTopicAssignment.createMany({ data: [...new Set(topicIds)].map(topicId => ({ counsellorId: counsellor.id, topicId, assignedById: actor.id })) });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'COUNSELLOR_TOPICS_UPDATED', entityType: 'CounsellorProfile', entityId: counsellor.id, metadata: { topicIds } } });
    });
    return this.prisma.counsellorProfile.findUnique({ where: { id: counsellor.id }, include: { topics: { include: { topic: true } } } });
  }

  async counsellorAvailability(actor: AuthenticatedUser, userId: string, availability: CounsellorAvailability) {
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN' && actor.id !== userId) throw new ForbiddenException('You cannot change this counsellor availability.');
    const account = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (account?.role !== UserRole.COUNSELLOR) throw new BadRequestException('Only counsellor accounts have an availability setting.');
    const profile = await this.prisma.counsellorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Counsellor profile not found.');
    if (availability === CounsellorAvailability.AVAILABLE) {
      const active = await this.prisma.discussionAssignment.count({ where: { counsellorId: profile.id, releasedAt: null, discussion: { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_MEMBER'] } } } });
      if (active >= 5) throw new BadRequestException('This counsellor already has five active discussions and cannot be marked available.');
    }
    const updated = await this.prisma.counsellorProfile.update({ where: { id: profile.id }, data: { availability } });
    await this.audit(actor.id, 'COUNSELLOR_AVAILABILITY_CHANGED', 'CounsellorProfile', profile.id);
    return updated;
  }

  private async audit(actorId: string, action: string, entityType: string, entityId: string | null, metadata: Prisma.InputJsonObject = {}) {
    await this.prisma.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } });
  }
}
