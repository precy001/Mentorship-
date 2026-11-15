import { Module } from '@nestjs/common';
import { ServiceAreasService } from './service-areas.service';

@Module({ providers: [ServiceAreasService], exports: [ServiceAreasService] })
export class ServiceAreasModule {}
