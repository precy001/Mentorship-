import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ServiceAreasService } from '../src/service-areas/service-areas.service';

type Row = { id: string; state: string; lga: string; lcda: string; isActive: boolean };
type Where = { id?: string; isActive?: boolean; state?: string | { equals: string }; lga?: string | { equals: string }; lcda?: string | { equals: string }; NOT?: { id: string } };

/** Small in-memory stand-in for prisma.serviceArea so the service's real query logic is exercised. */
function fakePrisma(seed: [string, string, string, boolean?][]) {
  let counter = 0;
  const rows: Row[] = seed.map(([state, lga, lcda, isActive = true]) => ({ id: `id${++counter}`, state, lga, lcda, isActive }));
  const eq = (actual: string, expected: string | { equals: string } | undefined) =>
    expected === undefined || (typeof expected === 'string' ? actual === expected : actual.toLowerCase() === expected.equals.toLowerCase());
  const matches = (r: Row, w: Where = {}) =>
    (w.id === undefined || r.id === w.id) && (w.isActive === undefined || r.isActive === w.isActive) && eq(r.state, w.state) && eq(r.lga, w.lga) && eq(r.lcda, w.lcda) && (!w.NOT || r.id !== w.NOT.id);
  const sorted = (list: Row[]) => [...list].sort((a, b) => `${a.state}|${a.lga}|${a.lcda}`.localeCompare(`${b.state}|${b.lga}|${b.lcda}`));
  const serviceArea = {
    findMany: async ({ where }: { where?: Where }) => sorted(rows.filter((r) => matches(r, where))).map((r) => ({ ...r })),
    findFirst: async ({ where }: { where?: Where }) => { const r = rows.find((x) => matches(x, where)); return r ? { ...r } : null; },
    findUnique: async ({ where }: { where: { id: string } }) => { const r = rows.find((x) => x.id === where.id); return r ? { ...r } : null; },
    count: async ({ where }: { where?: Where }) => rows.filter((r) => matches(r, where)).length,
    create: async ({ data }: { data: { state: string; lga: string; lcda: string } }) => { const r = { id: `id${++counter}`, isActive: true, ...data }; rows.push(r); return { ...r }; },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => { const r = rows.find((x) => x.id === where.id); if (!r) throw new Error('not found'); Object.assign(r, data); return { ...r }; },
    updateMany: async ({ where, data }: { where: Where; data: Partial<Row> }) => { const hit = rows.filter((r) => matches(r, where)); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; },
    delete: async ({ where }: { where: { id: string } }) => { rows.splice(rows.findIndex((x) => x.id === where.id), 1); return {}; },
  };
  return { prisma: { serviceArea }, rows };
}

const SEED: [string, string, string, boolean?][] = [
  ['Lagos', 'Alimosho', 'Ayobo-Ipaja LCDA'], ['Lagos', 'Alimosho', 'Egbe-Idimu LCDA'],
  ['Lagos', 'Ikeja', 'Ojodu LCDA'], ['Lagos', 'Ikeja', 'Onigbongbo LCDA', false],
  ['Lagos', 'Apapa', 'Apapa Iganmu LCDA', false],
];
const build = () => { const { prisma, rows } = fakePrisma(SEED); return { service: new ServiceAreasService(prisma as never), rows }; };

describe('ServiceAreasService (registration reads)', () => {
  it('lists only active LGAs that still have an active LCDA, with counts', async () => {
    const { service } = build();
    expect(await service.listActiveLgas()).toEqual([
      { state: 'Lagos', lga: 'Alimosho', lcdaCount: 2 },
      { state: 'Lagos', lga: 'Ikeja', lcdaCount: 1 },
    ]);
  });

  it('returns only the LCDAs of the requested LGA, and never inactive ones', async () => {
    const { service } = build();
    expect((await service.listActiveLcdas('Lagos', 'Alimosho')).map((a) => a.lcda)).toEqual(['Ayobo-Ipaja LCDA', 'Egbe-Idimu LCDA']);
    expect((await service.listActiveLcdas('Lagos', 'Ikeja')).map((a) => a.lcda)).toEqual(['Ojodu LCDA']);
    expect(await service.listActiveLcdas('Lagos', 'Apapa')).toEqual([]);
    await expect(service.listActiveLcdas('Lagos', ' ')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts an active selection and returns the stored values', async () => {
    const { service } = build();
    expect(await service.resolveActiveArea(' Lagos ', 'Alimosho', ' Egbe-Idimu LCDA ')).toMatchObject({ state: 'Lagos', lga: 'Alimosho', lcda: 'Egbe-Idimu LCDA' });
  });

  it('rejects inactive, mismatched, unknown and missing selections', async () => {
    const { service } = build();
    await expect(service.resolveActiveArea('Lagos', 'Ikeja', 'Onigbongbo LCDA')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.resolveActiveArea('Lagos', 'Ikeja', 'Ayobo-Ipaja LCDA')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.resolveActiveArea('Lagos', 'Nowhere', 'X LCDA')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.resolveActiveArea('Lagos', 'Ikeja', undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.resolveActiveArea(undefined, undefined, undefined)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ServiceAreasService (admin changes are reflected immediately)', () => {
  it('a newly created area is selectable straight away and a duplicate is refused regardless of case', async () => {
    const { service } = build();
    const created = await service.create({ state: 'Lagos', lga: 'Surulere', lcda: ' Itire-Ikate  LCDA ' });
    expect(created.lcda).toBe('Itire-Ikate LCDA');
    expect((await service.listActiveLcdas('Lagos', 'Surulere')).length).toBe(1);
    await expect(service.create({ state: 'Lagos', lga: 'surulere', lcda: 'itire-ikate lcda' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('disabling an area removes it from registration and enabling restores it', async () => {
    const { service, rows } = build();
    await service.setActive(rows[0].id, false);
    expect((await service.listActiveLcdas('Lagos', 'Alimosho')).map((a) => a.lcda)).toEqual(['Egbe-Idimu LCDA']);
    await expect(service.resolveActiveArea('Lagos', 'Alimosho', 'Ayobo-Ipaja LCDA')).rejects.toBeInstanceOf(BadRequestException);
    await service.setActive(rows[0].id, true);
    expect((await service.listActiveLcdas('Lagos', 'Alimosho')).length).toBe(2);
    await expect(service.setActive('missing', true)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('disabling a whole LGA hides it; enabling brings every LCDA back', async () => {
    const { service } = build();
    await service.setLgaActive('Lagos', 'Alimosho', false);
    expect((await service.listActiveLgas()).map((g) => g.lga)).toEqual(['Ikeja']);
    expect(await service.setLgaActive('Lagos', 'Ikeja', true)).toEqual({ updated: 2 });
    expect((await service.listActiveLcdas('Lagos', 'Ikeja')).length).toBe(2);
    await expect(service.setLgaActive('Lagos', 'Nowhere', true)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('editing moves an LCDA and blocks collisions', async () => {
    const { service, rows } = build();
    const updated = await service.update(rows[0].id, { state: 'Lagos', lga: 'Alimosho', lcda: 'Ayobo LCDA' });
    expect(updated.lcda).toBe('Ayobo LCDA');
    await expect(service.update(rows[0].id, { state: 'Lagos', lga: 'Alimosho', lcda: 'egbe-idimu lcda' })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.update('missing', { state: 'Lagos', lga: 'Ikeja', lcda: 'Z LCDA' })).rejects.toBeInstanceOf(NotFoundException);
    await service.update(rows[0].id, { state: 'Lagos', lga: 'Ikeja', lcda: 'Ayobo LCDA' });
    expect((await service.listActiveLcdas('Lagos', 'Ikeja')).map((a) => a.lcda)).toEqual(['Ayobo LCDA', 'Ojodu LCDA']);
  });

  it('renames an LGA for all its LCDAs and refuses to merge into an existing LGA', async () => {
    const { service } = build();
    expect(await service.renameLga('Lagos', 'Alimosho', 'Alimosho North')).toEqual({ updated: 2 });
    expect((await service.listActiveLgas()).map((g) => g.lga)).toEqual(['Alimosho North', 'Ikeja']);
    await expect(service.renameLga('Lagos', 'Ikeja', 'alimosho north')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.renameLga('Lagos', 'Nowhere', 'Anything')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('only deletes areas that were disabled first', async () => {
    const { service, rows } = build();
    await expect(service.remove(rows[0].id)).rejects.toBeInstanceOf(BadRequestException);
    expect(await service.remove(rows[4].id)).toEqual({ success: true });
    expect(rows.length).toBe(4);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
