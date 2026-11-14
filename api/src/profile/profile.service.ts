import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

type UploadedImage = { buffer: Buffer; mimetype: string };

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

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
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.replace(/\/$/, '');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET') || 'profile-photos';
    if (!supabaseUrl || !serviceKey) {
      throw new ServiceUnavailableException('Profile picture uploads are not configured. Please contact support.');
    }

    const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const objectPath = `${userId}/${randomUUID()}.${extension}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
    this.logger.log(`Supabase URL: ${supabaseUrl}`);
    this.logger.log(`Storage bucket: ${bucket}`);
    this.logger.log(`Storage upload URL: ${uploadUrl}`);
    const uploaded = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        'Content-Type': file.mimetype,
        'x-upsert': 'false',
      },
      body: new Uint8Array(file.buffer),
    });
    if (!uploaded.ok) {
      const detail = await uploaded.text().catch(() => '');
      this.logger.error(`Supabase Storage upload failed (${uploaded.status}): ${detail.slice(0, 500)}`);
      throw new ServiceUnavailableException('Your profile picture could not be saved. Please try again later.');
    }

    const avatarUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, avatarUrl },
      update: { avatarUrl },
    });
    return { avatarUrl };
  }
}
