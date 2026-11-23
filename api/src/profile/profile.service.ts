import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

type UploadedImage = { buffer: Buffer; mimetype: string };
type ProfileUpdate = { displayName?: string; phoneNumber?: string; dateOfBirth?: string; school?: string; nin?: string };

const MIN_AGE_YEARS = 13;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  async updateMembership(userId: string, categoryId: string, subcategoryId: string) {
    const subcategory = await this.prisma.membershipSubcategory.findFirst({
      where: { id: subcategoryId, categoryId, isActive: true, category: { isActive: true } },
      select: { id: true, name: true, slug: true, category: { select: { id: true, name: true, slug: true } } },
    });
    if (!subcategory) throw new BadRequestException('Choose an active subcategory belonging to the selected category.');
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, categoryId, subcategoryId },
      update: { categoryId, subcategoryId },
      select: { category: { select: { id: true, name: true, slug: true } }, subcategory: { select: { id: true, name: true, slug: true } } },
    });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: 'MEMBERSHIP_CATEGORY_CHANGED', entityType: 'UserProfile', entityId: userId, metadata: { categoryId, subcategoryId } } });
    return profile;
  }

  async uploadAvatar(userId: string, file: UploadedImage): Promise<{ avatarUrl: string }> {
    // Shared storage integration: same bucket, URL format and validation as admin content images.
    const { url: avatarUrl } = await this.storage.uploadImage(userId, file, 'Profile picture uploads are not configured. Please contact support.');
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, avatarUrl },
      update: { avatarUrl },
    });
    return { avatarUrl };
  }

  /** Updates only the fields that were sent. An empty phone number or school clears that value. */
  async updateProfile(userId: string, input: ProfileUpdate) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, profile: { select: { profileData: true } } } });
    if (!user) throw new NotFoundException('Your account could not be found.');

    let dateOfBirth: Date | null | undefined;
    if (input.dateOfBirth !== undefined) {
      dateOfBirth = new Date(input.dateOfBirth);
      const now = new Date();
      const oldest = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      const youngest = new Date(now.getFullYear() - MIN_AGE_YEARS, now.getMonth(), now.getDate());
      if (!Number.isFinite(dateOfBirth.getTime()) || dateOfBirth < oldest || dateOfBirth > youngest) {
        throw new BadRequestException(`Enter a valid date of birth. Members must be at least ${MIN_AGE_YEARS} years old.`);
      }
    }

    const existingData = user.profile?.profileData;
    const profileData: Prisma.JsonObject = existingData && typeof existingData === 'object' && !Array.isArray(existingData) ? { ...(existingData as Prisma.JsonObject) } : {};
    if (input.school !== undefined) profileData.school = input.school.trim() || null;
    if (input.nin !== undefined) {
      const nin = input.nin.replace(/[\s-]/g, '');
      if (!/^\d{11}$/.test(nin)) throw new BadRequestException('Enter your 11-digit National Identification Number (NIN).');
      profileData.nin = nin;
    }
    const profileDataChanged = input.school !== undefined || input.nin !== undefined;

    const phoneNumber = input.phoneNumber === undefined ? undefined : input.phoneNumber.trim() || null;

    await this.prisma.$transaction(async tx => {
      if (input.displayName !== undefined) await tx.user.update({ where: { id: userId }, data: { displayName: input.displayName.trim() } });
      await tx.userProfile.upsert({
        where: { userId },
        create: { userId, phoneNumber: phoneNumber ?? null, dateOfBirth: dateOfBirth ?? null, profileData },
        update: {
          ...(phoneNumber !== undefined ? { phoneNumber } : {}),
          ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
          ...(profileDataChanged ? { profileData } : {}),
        },
      });
      await tx.auditLog.create({ data: { actorId: userId, action: 'PROFILE_UPDATED', entityType: 'UserProfile', entityId: userId, metadata: { fields: Object.keys(input) } } });
    });
  }
}
