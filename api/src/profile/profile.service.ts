import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

type UploadedImage = { buffer: Buffer; mimetype: string };

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
}
