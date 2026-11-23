import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';
import { ServiceAreasModule } from '../service-areas/service-areas.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { InviteLinkController } from './invite-link.controller';
@Module({ imports: [AuthModule, MailModule, StorageModule, ServiceAreasModule], controllers: [AdminController, InviteLinkController], providers: [AdminService] })
export class AdminModule {}
