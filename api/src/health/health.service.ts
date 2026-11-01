import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  live(): { status: 'ok'; service: string; timestamp: string } {
    return { status: 'ok', service: 'mentorship-plus-api', timestamp: new Date().toISOString() };
  }

  async ready(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      this.logger.warn('Readiness check failed: database is unavailable');
      return false;
    }
  }
}