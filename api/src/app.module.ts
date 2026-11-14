import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MembershipModule } from './membership/membership.module';
import { ProfileModule } from './profile/profile.module';
import { AdminModule } from './admin/admin.module';
import { DiscussionsModule } from './discussions/discussions.module';
import { ActivitiesModule } from './activities/activities.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ContentModule } from './content/content.module';
import { RatingsModule } from './ratings/ratings.module';
import { validateEnvironment } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    PrismaModule,
    HealthModule,
    AuthModule,
    MembershipModule,
    ProfileModule,
    AdminModule,
    DiscussionsModule,
    ActivitiesModule,
    AppointmentsModule,
    ContentModule,
    RatingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}