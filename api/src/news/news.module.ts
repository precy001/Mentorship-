import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { AdminNewsController, NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({ imports: [AuthModule, StorageModule], controllers: [NewsController, AdminNewsController], providers: [NewsService] })
export class NewsModule {}
