import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NewsService } from '../src/news/news.service';
import { AdminNewsController, NewsController } from '../src/news/news.controller';
import { ROLES_KEY } from '../src/auth/decorators/roles.decorator';

function build() {
  const prisma = {
    newsPost: {
      findMany: jest.fn(async (_args: unknown) => [] as unknown[]),
      findFirst: jest.fn(async (_args: unknown) => null as unknown),
      findUnique: jest.fn(async (_args: unknown) => null as unknown),
      count: jest.fn(async (_args: unknown) => 0),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'n-1', ...data })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'n-1', ...data })),
      delete: jest.fn(async () => ({})),
    },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  const storage = { isManagedUrl: jest.fn((url: string) => url.startsWith('https://cdn.example.com/content/')), deleteByUrl: jest.fn(async () => undefined) };
  return { service: new NewsService(prisma as never, storage as never), prisma, storage };
}

describe('news feed', () => {
  it('lists published posts, pinned first then newest, and pages with a cursor', async () => {
    const { service, prisma } = build();
    prisma.newsPost.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const page = await service.feed({ limit: 2 });
    expect(page).toEqual({ items: [{ id: 'a' }, { id: 'b' }], nextCursor: 'b' });
    const args = prisma.newsPost.findMany.mock.calls[0][0] as Record<string, unknown>;
    expect(args).toMatchObject({ where: { isPublished: true }, take: 3, orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }] });
    expect(Object.keys(args.select as object)).not.toContain('authorId'); // the author is not exposed

    await service.feed({ limit: 2, cursor: 'b' });
    expect(prisma.newsPost.findMany.mock.calls[1][0]).toMatchObject({ cursor: { id: 'b' }, skip: 1 });
  });

  it('the last page has no next cursor', async () => {
    const { service, prisma } = build();
    prisma.newsPost.findMany.mockResolvedValue([{ id: 'a' }]);
    expect((await service.feed({})).nextCursor).toBeNull();
  });

  it('a draft or removed post is not available to readers', async () => {
    const { service } = build();
    await expect(service.getPublished('n-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('writing news', () => {
  it('publishing stamps publishedAt; a draft has none', async () => {
    const { service, prisma } = build();
    await service.create('admin-1', { title: ' Welcome ', body: ' Hello everyone ', linkUrl: '' });
    expect(prisma.newsPost.create.mock.calls[0][0].data).toMatchObject({ title: 'Welcome', body: 'Hello everyone', isPublished: true, pinned: false, linkUrl: null, authorId: 'admin-1' });
    expect(prisma.newsPost.create.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
    await service.create('admin-1', { title: 'Draft', body: 'Later', isPublished: false });
    expect(prisma.newsPost.create.mock.calls[1][0].data.publishedAt).toBeNull();
  });

  it('publishing a draft later stamps the date once; republishing keeps the original date', async () => {
    const { service, prisma } = build();
    prisma.newsPost.findUnique.mockResolvedValueOnce({ id: 'n-1', pinned: false, isPublished: false, publishedAt: null });
    await service.setFlags('admin-1', 'n-1', { isPublished: true });
    expect(prisma.newsPost.update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
    const original = new Date('2026-11-01T09:00:00Z');
    prisma.newsPost.findUnique.mockResolvedValueOnce({ id: 'n-1', pinned: false, isPublished: false, publishedAt: original });
    await service.setFlags('admin-1', 'n-1', { isPublished: true });
    expect(prisma.newsPost.update.mock.calls[1][0].data.publishedAt).toBeUndefined();
  });

  it(`allows at most ${NewsService.MAX_PINNED} pinned posts`, async () => {
    const { service, prisma } = build();
    prisma.newsPost.count.mockResolvedValue(NewsService.MAX_PINNED);
    await expect(service.create('admin-1', { title: 'Hi', body: 'There', pinned: true })).rejects.toBeInstanceOf(BadRequestException);
    // A pinned draft does not take a slot.
    await expect(service.create('admin-1', { title: 'Hi', body: 'There', pinned: true, isPublished: false })).resolves.toBeDefined();
  });

  it('only accepts images uploaded through Mentorship+', async () => {
    const { service } = build();
    await expect(service.create('admin-1', { title: 'Hi', body: 'There', imageUrl: 'https://evil.example.com/x.png' })).rejects.toThrow(/uploaded through Mentorship\+/);
    await expect(service.create('admin-1', { title: 'Hi', body: 'There', imageUrl: 'https://cdn.example.com/content/x.png' })).resolves.toMatchObject({ imageUrl: 'https://cdn.example.com/content/x.png' });
  });

  it('deleting a post removes its image too', async () => {
    const { service, prisma, storage } = build();
    prisma.newsPost.findUnique.mockResolvedValue({ id: 'n-1', imageUrl: 'https://cdn.example.com/content/x.png', title: 'Hi' });
    await service.remove('admin-1', 'n-1');
    expect(storage.deleteByUrl).toHaveBeenCalledWith('https://cdn.example.com/content/x.png');
  });

  it('writing is admin-only; reading only needs a signed-in account', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminNewsController)).toEqual(['ADMIN', 'SUPER_ADMIN']);
    expect(Reflect.getMetadata(ROLES_KEY, NewsController)).toBeUndefined();
  });
});
