import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller';
import { ServiceAreasModule } from '../service-areas/service-areas.module';

@Module({ imports: [ServiceAreasModule], controllers: [MembershipController] })
export class MembershipModule {}
