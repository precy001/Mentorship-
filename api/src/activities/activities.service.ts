import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}
  list(userId: string, type?: string) { return this.prisma.activityRecord.findMany({ where: { userId, ...(type ? { type } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  create(userId: string, type: string, payload: Record<string, unknown>) { return this.prisma.activityRecord.create({ data: { userId, type, payload: payload as Prisma.InputJsonValue } }); }
  async update(userId: string, id: string, type: string, payload: Record<string, unknown>) {
    const result = await this.prisma.activityRecord.updateMany({ where: { id, userId, type }, data: { payload: payload as Prisma.InputJsonValue } });
    if (!result.count) throw new NotFoundException('Activity record not found.');
    return this.prisma.activityRecord.findUniqueOrThrow({ where: { id } });
  }
  notifications(userId: string) { return this.prisma.userNotification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  async markNotificationRead(userId: string, id: string) {
    const result = await this.prisma.userNotification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    if (!result.count) {
      const exists = await this.prisma.userNotification.findFirst({ where: { id, userId }, select: { id: true } });
      if (!exists) throw new NotFoundException('Notification not found.');
    }
    return { success: true };
  }

}
