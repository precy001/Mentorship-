import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('membership')
export class MembershipController {
  constructor(private readonly prisma: PrismaService) {}

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
