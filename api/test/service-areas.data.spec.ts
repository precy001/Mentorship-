import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RETIRED_SERVICE_AREAS, SERVICE_AREAS } from '../prisma/data/service-areas';

const migration = readFileSync(join(__dirname, '../prisma/migrations/20261114120000_restore_service_areas/migration.sql'), 'utf8');
const statements = migration.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n');
const rows = [...migration.matchAll(/^\s*\('([^']+)', '([^']+)', '([^']+)'\),?$/gm)].map((m) => `${m[1]}|${m[2]}|${m[3]}`);

describe('original service-area list', () => {
  it('keeps all 37 Lagos pairings across 21 LGA entries, with no duplicates', () => {
    expect(SERVICE_AREAS.length).toBe(37);
    expect(new Set(SERVICE_AREAS.map((a) => a.join('|'))).size).toBe(37);
    expect(new Set(SERVICE_AREAS.map((a) => a[1])).size).toBe(21);
    expect(SERVICE_AREAS.every((a) => a[0] === 'Lagos')).toBe(true);
  });

  it('keeps the original LGA to LCDA pairings', () => {
    const lcdasOf = (lga: string) => SERVICE_AREAS.filter((a) => a[1] === lga).map((a) => a[2]);
    expect(lcdasOf('Alimosho')).toEqual(['Agbado-Oke Odo LCDA', 'Ayobo-Ipaja LCDA', 'Egbe-Idimu LCDA', 'Mosan-Okunola LCDA', 'Igando-Ikotun LCDA']);
    expect(lcdasOf('Ikorodu')).toEqual(['Igbogbo-Baiyeku LCDA', 'Ijede LCDA', 'Imota LCDA', 'Ikorodu North LCDA', 'Ikorodu West LCDA']);
    expect(lcdasOf('Eti-Osa')).toEqual(['Ikoyi-Obalende LCDA', 'Iru/Victoria Island LCDA']);
    expect(lcdasOf('Ibeju-Lekki')).toEqual(['Lekki LCDA']);
    expect(lcdasOf('Other / not listed')).toEqual(['Other LCDA']);
  });

  it('is exactly what the restore migration inserts', () => {
    expect(rows).toEqual(SERVICE_AREAS.map((a) => a.join('|')));
  });
});

describe('restore migration', () => {
  it('is repeatable and non-destructive', () => {
    expect(migration).toContain('ON CONFLICT ("state", "lga", "lcda") DO NOTHING');
    expect(statements).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/i);
  });

  it('only retires (never deletes) the legacy pairings', () => {
    for (const [, lga, lcda] of RETIRED_SERVICE_AREAS) expect(migration).toContain(`"lga" = '${lga}' AND "lcda" = '${lcda}'`);
    expect(migration).toContain('SET "isActive" = false');
  });
});
