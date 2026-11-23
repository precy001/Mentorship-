import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CONTENT_IMAGE_FOLDER } from '../content/content.constants';

export type NewsInput = { title: string; body: string; imageUrl?: string | null; linkUrl?: string | null; pinned?: boolean; isPublished?: boolean };

/** What everyone sees. The author is not exposed: posts are from "the Mentorship+ team". */
const PUBLIC_FIELDS = { id: true, title: true, body: true, imageUrl: true, linkUrl: true, pinned: true, publishedAt: true, updatedAt: true } satisfies Prisma.NewsPostSelect;

/** Newest first, pinned above the rest; `id` breaks ties so pages never skip or repeat a post. */
const FEED_ORDER: Prisma.NewsPostOrderByWithRelationInput[] = [{ pinned: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }];

/**
 * News & updates. Administrators write posts; every signed-in person (members, counsellors, admins) reads the same
 * feed. Posts are read on demand (pull) rather than copied into each person's notifications (push): one row per
 * post instead of one per user, nothing to clean up when a post is edited or removed, and the app shows a "new" dot
 * by comparing the newest post's date with the last one the person saw.
 */
@Injectable()
export class NewsService {
  static readonly DEFAULT_PAGE = 20;
  /** Pinning is for the one or two things everyone must see; more than this and nothing stands out. */
  static readonly MAX_PINNED = 3;

  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  async feed(query: { limit?: number; cursor?: string }) {
    const take = query.limit ?? NewsService.DEFAULT_PAGE;
    const rows = await this.prisma.newsPost.findMany({
      where: { isPublished: true },
      orderBy: FEED_ORDER,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: PUBLIC_FIELDS,
    });
    const items = rows.slice(0, take);
    return { items, nextCursor: rows.length > take ? items[items.length - 1].id : null };
  }

  async getPublished(id: string) {
    const post = await this.prisma.newsPost.findFirst({ where: { id, isPublished: true }, select: PUBLIC_FIELDS });
    if (!post) throw new NotFoundException('This update is no longer available.');
    return post;
  }

  /** Admin list: drafts included, newest edits first. */
  listAll() {
    return this.prisma.newsPost.findMany({ orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }], include: { author: { select: { id: true, displayName: true } } } });
  }

  async create(actorId: string, input: NewsInput) {
    const isPublished = input.isPublished ?? true;
    const pinned = input.pinned ?? false;
    if (pinned && isPublished) await this.assertPinSlot();
    const post = await this.prisma.newsPost.create({ data: {
      title: input.title.trim(), body: input.body.trim(),
      imageUrl: this.managedImageUrl(input.imageUrl), linkUrl: this.link(input.linkUrl),
      pinned, isPublished, publishedAt: isPublished ? new Date() : null, authorId: actorId,
    } });
    await this.audit(actorId, 'NEWS_CREATED', post.id, { isPublished, pinned });
    return post;
  }

  async update(actorId: string, id: string, input: NewsInput) {
    const existing = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Update not found.');
    const imageUrl = input.imageUrl === undefined ? undefined : this.managedImageUrl(input.imageUrl);
    const flags = await this.resolveFlags(existing, input);
    const post = await this.prisma.newsPost.update({ where: { id }, data: {
      title: input.title.trim(), body: input.body.trim(), linkUrl: this.link(input.linkUrl),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...flags,
    } });
    await this.audit(actorId, 'NEWS_UPDATED', id);
    if (imageUrl !== undefined && existing.imageUrl && existing.imageUrl !== imageUrl) void this.storage.deleteByUrl(existing.imageUrl);
    return post;
  }

  async setFlags(actorId: string, id: string, input: { pinned?: boolean; isPublished?: boolean }) {
    const existing = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Update not found.');
    const flags = await this.resolveFlags(existing, input);
    const post = await this.prisma.newsPost.update({ where: { id }, data: flags });
    if (input.isPublished !== undefined && input.isPublished !== existing.isPublished) await this.audit(actorId, input.isPublished ? 'NEWS_PUBLISHED' : 'NEWS_UNPUBLISHED', id);
    if (input.pinned !== undefined && input.pinned !== existing.pinned) await this.audit(actorId, input.pinned ? 'NEWS_PINNED' : 'NEWS_UNPINNED', id);
    return post;
  }

  async remove(actorId: string, id: string) {
    const existing = await this.prisma.newsPost.findUnique({ where: { id }, select: { id: true, imageUrl: true, title: true } });
    if (!existing) throw new NotFoundException('Update not found.');
    await this.prisma.newsPost.delete({ where: { id } });
    await this.audit(actorId, 'NEWS_DELETED', id, { title: existing.title });
    void this.storage.deleteByUrl(existing.imageUrl);
    return { success: true };
  }

  /**
   * Publishing for the first time stamps `publishedAt` (the feed order and the "new" dot use it). Unpublishing and
   * publishing again keeps the original date, so fixing a typo does not push an old post back to the top.
   */
  private async resolveFlags(existing: { id: string; pinned: boolean; isPublished: boolean; publishedAt: Date | null }, input: { pinned?: boolean; isPublished?: boolean }) {
    const isPublished = input.isPublished ?? existing.isPublished;
    const pinned = input.pinned ?? existing.pinned;
    if (pinned && isPublished && !(existing.pinned && existing.isPublished)) await this.assertPinSlot(existing.id);
    return { isPublished, pinned, ...(isPublished && !existing.publishedAt ? { publishedAt: new Date() } : {}) };
  }

  private async assertPinSlot(exceptId?: string) {
    const pinned = await this.prisma.newsPost.count({ where: { pinned: true, isPublished: true, ...(exceptId ? { id: { not: exceptId } } : {}) } });
    if (pinned >= NewsService.MAX_PINNED) throw new BadRequestException(`Up to ${NewsService.MAX_PINNED} updates can be pinned. Unpin one first.`);
  }

  /** Accepts only images uploaded through Mentorship+ (Admin > upload); null for "no image". */
  private managedImageUrl(value: string | null | undefined): string | null {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return null;
    if (!this.storage.isManagedUrl(url, CONTENT_IMAGE_FOLDER)) throw new BadRequestException('The image must be uploaded through Mentorship+ before it can be attached.');
    return url;
  }

  private link(value: string | null | undefined): string | null {
    const url = typeof value === 'string' ? value.trim() : '';
    return url || null;
  }

  private async audit(actorId: string, action: string, entityId: string, metadata: Prisma.InputJsonObject = {}) {
    await this.prisma.auditLog.create({ data: { actorId, action, entityType: 'NewsPost', entityId, metadata } });
  }
}
