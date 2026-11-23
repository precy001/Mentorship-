import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Public content lists. Each item carries its audience (membership category / subcategory slugs; both empty =
 * everyone) so the app can show members only what is meant for them.
 */
@Controller('content')
export class ContentController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('resources') resources() { return this.prisma.resource.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }); }
  @Get('scholarships') scholarships() { return this.prisma.scholarship.findMany({ where: { isActive: true, deadline: { gte: new Date() } }, orderBy: { deadline: 'asc' } }); }
  /** Open grants: no deadline (open all year) or a deadline that has not passed. Soonest deadline first. */
  @Get('grants') grants() {
    return this.prisma.grant.findMany({
      where: { isActive: true, OR: [{ deadline: null }, { deadline: { gte: new Date() } }] },
      orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
  }
}
