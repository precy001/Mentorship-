import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AdminService } from '../src/admin/admin.service';
import { GrantDto, ResourceDto, ScholarshipDto } from '../src/admin/admin.dto';
import { DEFAULT_AUDIENCE } from '../src/content/content.constants';

const messages = <T extends object>(cls: new () => T, payload: Record<string, unknown>) =>
  validateSync(plainToInstance(cls, payload)).flatMap((error) => Object.values(error.constraints ?? {}));

const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
const past = new Date(Date.now() - 30 * 86_400_000).toISOString();
const grant = { title: 'Tools grant', provider: 'Acme Foundation', eligibility: 'Artisans in Lagos', description: 'Money for tools.' };

function build() {
  const created = (id: string) => jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id, ...data }));
  const prisma = {
    resource: { create: created('r1'), findUnique: jest.fn(), update: created('r1') },
    scholarship: { create: created('s1'), findUnique: jest.fn(), update: created('s1') },
    grant: { create: created('g1'), findUnique: jest.fn(), update: created('g1'), delete: jest.fn(async (_args: unknown) => ({})) },
    membershipCategory: { findMany: jest.fn(async ({ where }: { where: { slug: { in: string[] } } }) => where.slug.in.filter((slug) => ['education-learning', 'work-career'].includes(slug)).map((slug) => ({ slug }))) },
    membershipSubcategory: { findMany: jest.fn(async ({ where }: { where: { slug: { in: string[] } } }) => where.slug.in.filter((slug) => ['artisan-skilled-tradesperson', 'undergraduate'].includes(slug)).map((slug) => ({ slug }))) },
    auditLog: { create: jest.fn(async (_args: unknown) => ({})) },
  };
  const storage = { isManagedUrl: jest.fn(() => true), deleteByUrl: jest.fn(async () => undefined) };
  const service = new AdminService(prisma as never, {} as never, {} as never, storage as never, {} as never);
  return { service, prisma };
}

describe('GrantDto', () => {
  it('accepts a grant with or without a deadline, amount and link', () => {
    expect(messages(GrantDto, grant)).toEqual([]);
    expect(messages(GrantDto, { ...grant, deadline: null, amount: null, applyUrl: null })).toEqual([]);
    expect(messages(GrantDto, { ...grant, deadline: future, amount: 'Up to ₦250,000', applyUrl: 'https://example.org/apply' })).toEqual([]);
  });

  it('rejects links that are not full web addresses', () => {
    for (const applyUrl of ['example.org', 'javascript:alert(1)', 'ftp://example.org/file']) {
      expect(messages(GrantDto, { ...grant, applyUrl }).join(' ')).toMatch(/https:\/\//);
    }
    expect(messages(GrantDto, { ...grant, applyUrl: '' })).toEqual([]);
  });

  it('requires title, provider, eligibility and description', () => {
    const errors = messages(GrantDto, {});
    expect(errors.join(' ')).toMatch(/Title/);
    expect(errors.join(' ')).toMatch(/Provider/);
    expect(errors.join(' ')).toMatch(/Eligibility/);
    expect(errors.join(' ')).toMatch(/Description/);
  });
});

describe('audience fields on content DTOs', () => {
  const resource = { title: 'Writing a CV', category: 'Career', readTime: '5 min read', description: 'How to write a CV.' };
  it('accepts lists of slugs and rejects non-lists', () => {
    expect(messages(ResourceDto, { ...resource, audienceCategories: ['work-career'], audienceSubcategories: [] })).toEqual([]);
    expect(messages(ResourceDto, { ...resource, audienceCategories: 'work-career' }).join(' ')).toMatch(/must be a list/);
  });
  it('lets scholarships carry an optional official link', () => {
    const scholarship = { title: 'Award', provider: 'Acme', level: 'Undergraduate', eligibility: 'Students', description: 'Funding.', deadline: future };
    expect(messages(ScholarshipDto, { ...scholarship, applyUrl: 'https://acme.org/award' })).toEqual([]);
    expect(messages(ScholarshipDto, { ...scholarship, applyUrl: 'acme.org' }).length).toBeGreaterThan(0);
  });
});

describe('AdminService audience defaults', () => {
  it('targets resources at everyone, scholarships at students and grants at working members by default', async () => {
    const { service, prisma } = build();
    await service.createResource('a', { title: 'R', category: 'Career', description: 'D' });
    await service.createScholarship('a', { title: 'S', provider: 'P', level: 'Undergraduate', deadline: future, eligibility: 'E', description: 'D' });
    await service.createGrant('a', grant);
    expect(prisma.resource.create.mock.calls[0][0].data).toMatchObject(DEFAULT_AUDIENCE.resource);
    expect(prisma.scholarship.create.mock.calls[0][0].data).toMatchObject({ audienceCategories: ['education-learning'], audienceSubcategories: [] });
    expect(prisma.grant.create.mock.calls[0][0].data).toMatchObject({ audienceCategories: ['work-career'], audienceSubcategories: [], deadline: null, amount: null, applyUrl: null });
    // Defaults never need a database lookup.
    expect(prisma.membershipCategory.findMany).not.toHaveBeenCalled();
  });

  it('stores a chosen audience after checking the slugs exist', async () => {
    const { service, prisma } = build();
    await service.createGrant('a', { ...grant, audienceCategories: [' work-career ', 'work-career'], audienceSubcategories: ['artisan-skilled-tradesperson'] });
    expect(prisma.grant.create.mock.calls[0][0].data).toMatchObject({ audienceCategories: ['work-career'], audienceSubcategories: ['artisan-skilled-tradesperson'] });
  });

  it('allows "everyone" (both lists empty) for any content type', async () => {
    const { service, prisma } = build();
    await service.createGrant('a', { ...grant, audienceCategories: [], audienceSubcategories: [] });
    expect(prisma.grant.create.mock.calls[0][0].data).toMatchObject({ audienceCategories: [], audienceSubcategories: [] });
  });

  it('rejects unknown groups', async () => {
    const { service, prisma } = build();
    await expect(service.createGrant('a', { ...grant, audienceCategories: ['made-up'] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createResource('a', { title: 'R', category: 'Career', description: 'D', audienceSubcategories: ['nope'] })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.grant.create).not.toHaveBeenCalled();
  });

  it('leaves the audience unchanged on update when it is not sent', async () => {
    const { service, prisma } = build();
    prisma.resource.findUnique.mockResolvedValue({ id: 'r1', imageUrl: null });
    await service.updateResource('a', 'r1', { title: 'R', category: 'Career', description: 'D' });
    expect('audienceCategories' in prisma.resource.update.mock.calls[0][0].data).toBe(false);
    await service.updateResource('a', 'r1', { title: 'R', category: 'Career', description: 'D', audienceCategories: ['education-learning'], audienceSubcategories: [] });
    expect(prisma.resource.update.mock.calls[1][0].data).toMatchObject({ audienceCategories: ['education-learning'], audienceSubcategories: [] });
  });
});

describe('AdminService grants', () => {
  it('accepts an open-all-year grant and rejects a past deadline', async () => {
    const { service, prisma } = build();
    await service.createGrant('a', { ...grant, deadline: null });
    expect(prisma.grant.create.mock.calls[0][0].data.deadline).toBeNull();
    await expect(service.createGrant('a', { ...grant, deadline: past })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps an already-passed deadline when only other details change, and allows clearing it', async () => {
    const { service, prisma } = build();
    prisma.grant.findUnique.mockResolvedValue({ id: 'g1', deadline: new Date(past), imageUrl: null });
    await service.updateGrant('a', 'g1', { ...grant, deadline: past });
    expect((prisma.grant.update.mock.calls[0][0].data.deadline as Date).toISOString()).toBe(past);
    await service.updateGrant('a', 'g1', { ...grant, deadline: null, applyUrl: '' });
    expect(prisma.grant.update.mock.calls[1][0].data).toMatchObject({ deadline: null, applyUrl: null });
  });

  it('reports a missing grant', async () => {
    const { service, prisma } = build();
    prisma.grant.findUnique.mockResolvedValue(null);
    await expect(service.updateGrant('a', 'missing', grant)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.deleteGrant('a', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
