import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  live(): { status: 'ok'; service: string; timestamp: string } {
    return this.healthService.live();
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok'; database: 'connected'; timestamp: string }> {
    const ready = await this.healthService.ready();
    if (!ready) throw new ServiceUnavailableException('Service is not ready');
    return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
  }
}