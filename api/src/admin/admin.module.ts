import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
@Module({ imports: [AuthModule, MailModule, StorageModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
