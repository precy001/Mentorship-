import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from '../src/admin/admin.service';

const BASE = 'https://project.supabase.co/storage/v1/object/public/profile-photos';
const managed = `${BASE}/content/new.png`;
const oldImage = `${BASE}/content/old.png`;
const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
const past = new Date(Date.now() - 30 * 86_400_000).toISOString();

function build() {
  const prisma = {
    resource: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'r1', ...data })), findUnique: jest.fn(), update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'r1', ...data })), delete: jest.fn(async (_args: unknown) => ({})) },
    scholarship: { create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 's1', ...data })), findUnique: jest.fn(), update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 's1', ...data })), delete: jest.fn(async (_args: unknown) => ({})) },
    auditLog: { create: jest.fn(async (_args: unknown) => ({})) },
  };
  const storage = {
    uploadImage: jest.fn(async (_folder: string, _file: unknown) => ({ url: managed, path: 'content/new.png' })),
    isManagedUrl: jest.fn((url: string, folder: string) => url.startsWith(`${BASE}/${folder}/`)),
    deleteByUrl: jest.fn(async (_url: string | null | undefined) => undefined),
  };
  const service = new AdminService(prisma as never, {} as never, {} as never, storage as never, {} as never);
  return { service, prisma, storage };
}

const resourceInput = { title: ' Writing a CV ', category: 'Career', readTime: '5 min read', description: ' A guide. ' };
const scholarshipInput = { title: 'STEM Award', provider: 'Acme', level: 'Undergraduate', eligibility: 'Students', description: 'Funding.', deadline: future };

describe('AdminService content images', () => {
  it('stores the uploaded image URL on a new resource and trims text', async () => {
    const { service, prisma } = build();
    const created = await service.createResource('admin-1', { ...resourceInput, imageUrl: managed });
    expect(prisma.resource.create.mock.calls[0][0].data).toMatchObject({ title: 'Writing a CV', description: 'A guide.', imageUrl: managed });
    expect(created.imageUrl).toBe(managed);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('stores null when no image is supplied', async () => {
    const { service, prisma } = build();
    await service.createResource('admin-1', resourceInput);
    expect(prisma.resource.create.mock.calls[0][0].data.imageUrl).toBeNull();
  });

  it('refuses image URLs that were not uploaded through the platform', async () => {
    const { service, prisma } = build();
    await expect(service.createResource('admin-1', { ...resourceInput, imageUrl: 'https://evil.example/x.png' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createScholarship('admin-1', { ...scholarshipInput, imageUrl: `${BASE}/user-1/avatar.png` })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.resource.create).not.toHaveBeenCalled();
    expect(prisma.scholarship.create).not.toHaveBeenCalled();
  });

  it('uploads content images into the content folder and returns the URL', async () => {
    const { service, storage } = build();
    const result = await service.uploadContentImage('admin-1', { buffer: Buffer.alloc(20), mimetype: 'image/png' });
    expect(storage.uploadImage.mock.calls[0][0]).toBe('content');
    expect(result).toEqual({ imageUrl: managed });
  });
});

describe('AdminService resource update and delete', () => {
  it('replaces an image and removes the previous file', async () => {
    const { service, prisma, storage } = build();
    prisma.resource.findUnique.mockResolvedValue({ id: 'r1', imageUrl: oldImage });
    await service.updateResource('admin-1', 'r1', { ...resourceInput, imageUrl: managed });
    expect(prisma.resource.update.mock.calls[0][0].data.imageUrl).toBe(managed);
    expect(storage.deleteByUrl).toHaveBeenCalledWith(oldImage);
  });

  it('removes the image when imageUrl is null and keeps it when omitted', async () => {
    const { service, prisma, storage } = build();
    prisma.resource.findUnique.mockResolvedValue({ id: 'r1', imageUrl: oldImage });
    await service.updateResource('admin-1', 'r1', { ...resourceInput, imageUrl: null });
    expect(prisma.resource.update.mock.calls[0][0].data.imageUrl).toBeNull();
    expect(storage.deleteByUrl).toHaveBeenCalledWith(oldImage);

    storage.deleteByUrl.mockClear();
    await service.updateResource('admin-1', 'r1', resourceInput);
    expect('imageUrl' in prisma.resource.update.mock.calls[1][0].data).toBe(false);
    expect(storage.deleteByUrl).not.toHaveBeenCalled();
  });

  it('reports missing records', async () => {
    const { service, prisma } = build();
    prisma.resource.findUnique.mockResolvedValue(null);
    await expect(service.updateResource('admin-1', 'nope', resourceInput)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.deleteResource('admin-1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a resource, its audit trail entry and its stored image', async () => {
    const { service, prisma, storage } = build();
    prisma.resource.findUnique.mockResolvedValue({ id: 'r1', imageUrl: oldImage });
    await expect(service.deleteResource('admin-1', 'r1')).resolves.toEqual({ success: true });
    expect(prisma.resource.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(storage.deleteByUrl).toHaveBeenCalledWith(oldImage);
  });
});

describe('AdminService scholarships', () => {
  it('requires a future deadline when creating', async () => {
    const { service, prisma } = build();
    await expect(service.createScholarship('admin-1', { ...scholarshipInput, deadline: past })).rejects.toThrow('The scholarship deadline must be in the future.');
    expect(prisma.scholarship.create).not.toHaveBeenCalled();
    await service.createScholarship('admin-1', { ...scholarshipInput, imageUrl: managed });
    expect(prisma.scholarship.create.mock.calls[0][0].data).toMatchObject({ imageUrl: managed, level: 'Undergraduate' });
  });

  it('lets an expired listing be corrected but rejects moving its deadline into the past', async () => {
    const { service, prisma } = build();
    prisma.scholarship.findUnique.mockResolvedValue({ id: 's1', deadline: new Date(past), imageUrl: null });
    await expect(service.updateScholarship('admin-1', 's1', { ...scholarshipInput, deadline: past })).resolves.toBeDefined();
    const earlier = new Date(Date.now() - 86_400_000).toISOString();
    await expect(service.updateScholarship('admin-1', 's1', { ...scholarshipInput, deadline: earlier })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes scholarships and reports missing ones', async () => {
    const { service, prisma } = build();
    prisma.scholarship.findUnique.mockResolvedValue(null);
    await expect(service.deleteScholarship('admin-1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
    prisma.scholarship.findUnique.mockResolvedValue({ id: 's1', imageUrl: oldImage });
    await expect(service.deleteScholarship('admin-1', 's1')).resolves.toEqual({ success: true });
  });
});
