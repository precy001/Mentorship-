import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ActiveLga = { state: string; lga: string; lcdaCount: number };
export type AreaInput = { state: string; lga: string; lcda: string };

const ORDER = [{ state: 'asc' as const }, { lga: 'asc' as const }, { lcda: 'asc' as const }];
const clean = (value: string | undefined | null) => (value ?? '').trim().replace(/\s+/g, ' ');
const isUniqueViolation = (error: unknown) => typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';

/**
 * The service_area table is the single source of truth for LGAs and LCDAs. Registration, the public
 * locations endpoints and the admin screens all read and write through this service.
 */
@Injectable()
export class ServiceAreasService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------------------------------------- public (registration) */

  /** Active LGAs that still have at least one active LCDA to choose from. */
  async listActiveLgas(state?: string): Promise<ActiveLga[]> {
    const rows = await this.prisma.serviceArea.findMany({ where: { isActive: true, ...(clean(state) ? { state: clean(state) } : {}) }, orderBy: ORDER, select: { state: true, lga: true } });
    const groups = new Map<string, ActiveLga>();
    for (const row of rows) {
      const key = `${row.state}::${row.lga}`;
      const group = groups.get(key) ?? { state: row.state, lga: row.lga, lcdaCount: 0 };
      group.lcdaCount += 1;
      groups.set(key, group);
    }
    return [...groups.values()];
  }

  /** Active LCDAs that belong to exactly one LGA. */
  async listActiveLcdas(state: string, lga: string) {
    if (!clean(state) || !clean(lga)) throw new BadRequestException('Choose a state and an LGA first.');
    return this.prisma.serviceArea.findMany({ where: { isActive: true, state: clean(state), lga: clean(lga) }, orderBy: ORDER, select: { id: true, state: true, lga: true, lcda: true } });
  }

  /** Registration check. Returns the stored (canonical) values, or throws a clear 400. */
  async resolveActiveArea(state: string | undefined, lga: string | undefined, lcda: string | undefined) {
    if (!clean(state) || !clean(lga) || !clean(lcda)) throw new BadRequestException('Choose your state, LGA and LCDA from the available service areas.');
    const area = await this.prisma.serviceArea.findFirst({ where: { state: clean(state), lga: clean(lga), lcda: clean(lcda), isActive: true }, select: { id: true, state: true, lga: true, lcda: true } });
    if (!area) throw new BadRequestException('This LGA/LCDA is not currently available for registration. Go back and choose an enabled area.');
    return area;
  }

  /* ------------------------------------------------------------- admin */

  listAll() {
    return this.prisma.serviceArea.findMany({ orderBy: ORDER });
  }

  private async assertNoDuplicate(input: AreaInput, ignoreId?: string) {
    const clash = await this.prisma.serviceArea.findFirst({
      where: {
        state: { equals: input.state, mode: 'insensitive' }, lga: { equals: input.lga, mode: 'insensitive' }, lcda: { equals: input.lcda, mode: 'insensitive' },
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`${input.lcda} already exists under ${input.lga}.`);
  }

  async create(input: AreaInput) {
    const data = { state: clean(input.state), lga: clean(input.lga), lcda: clean(input.lcda) };
    await this.assertNoDuplicate(data);
    try {
      return await this.prisma.serviceArea.create({ data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(`${data.lcda} already exists under ${data.lga}.`);
      throw error;
    }
  }

  async update(id: string, input: AreaInput) {
    const existing = await this.prisma.serviceArea.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Service area not found.');
    const data = { state: clean(input.state), lga: clean(input.lga), lcda: clean(input.lcda) };
    await this.assertNoDuplicate(data, id);
    try {
      return await this.prisma.serviceArea.update({ where: { id }, data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(`${data.lcda} already exists under ${data.lga}.`);
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean) {
    const area = await this.prisma.serviceArea.update({ where: { id }, data: { isActive } }).catch(() => null);
    if (!area) throw new NotFoundException('Service area not found.');
    return area;
  }

  /** Enables or disables every LCDA of one LGA. */
  async setLgaActive(state: string, lga: string, isActive: boolean) {
    const result = await this.prisma.serviceArea.updateMany({ where: { state: clean(state), lga: clean(lga) }, data: { isActive } });
    if (!result.count) throw new NotFoundException('LGA not found.');
    return { updated: result.count };
  }

  async renameLga(state: string, lga: string, newLga: string) {
    const from = { state: clean(state), lga: clean(lga) };
    const to = clean(newLga);
    const members = await this.prisma.serviceArea.count({ where: from });
    if (!members) throw new NotFoundException('LGA not found.');
    if (to.toLowerCase() !== from.lga.toLowerCase()) {
      const taken = await this.prisma.serviceArea.count({ where: { state: from.state, lga: { equals: to, mode: 'insensitive' } } });
      if (taken) throw new ConflictException(`An LGA named ${to} already exists. Move its LCDAs by editing them individually.`);
    }
    await this.prisma.serviceArea.updateMany({ where: from, data: { lga: to } });
    return { updated: members };
  }

  /** Deletion is limited to areas that are already disabled; disabling is the normal way to hide an area. */
  async remove(id: string) {
    const area = await this.prisma.serviceArea.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!area) throw new NotFoundException('Service area not found.');
    if (area.isActive) throw new BadRequestException('Disable this area before deleting it.');
    await this.prisma.serviceArea.delete({ where: { id } });
    return { success: true };
  }
}
