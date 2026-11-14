import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Controller('content')
export class ContentController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('resources') resources() { return this.prisma.resource.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }); }
  @Get('scholarships') scholarships() { return this.prisma.scholarship.findMany({ where: { isActive: true, deadline: { gte: new Date() } }, orderBy: { deadline: 'asc' } }); }
}
