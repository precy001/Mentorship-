import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceAreasService } from '../service-areas/service-areas.service';

@Controller('membership')
export class MembershipController {
  constructor(private readonly prisma: PrismaService, private readonly serviceAreas: ServiceAreasService) {}

  @Get('locations')
  async getLocations() {
    const locations = await this.prisma.serviceArea.findMany({ where: { isActive: true }, orderBy: [{ state: 'asc' }, { lga: 'asc' }, { lcda: 'asc' }], select: { id: true, state: true, lga: true, lcda: true } });
    return { locations };
  }

  /** Active LGAs that have at least one active LCDA. */
  @Get('lgas')
  async getLgas(@Query('state') state?: string) {
    return { lgas: await this.serviceAreas.listActiveLgas(state) };
  }

  /** Active LCDAs of one LGA only: GET /membership/lcdas?state=Lagos&lga=Alimosho */
  @Get('lcdas')
  async getLcdas(@Query('state') state: string, @Query('lga') lga: string) {
    return { lcdas: await this.serviceAreas.listActiveLcdas(state, lga) };
  }

  @Get('categories')
  async getCategories() {
    const categories = await this.prisma.membershipCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, slug: true, description: true,
        subcategories: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: { id: true, name: true, slug: true, description: true },
        },
      },
    });
    return { categories };
  }
}
