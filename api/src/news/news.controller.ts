import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NewsFeedQuery, NewsFlagsDto, NewsPostDto } from './news.dto';
import { NewsService } from './news.service';

/** The feed: any signed-in account (member, counsellor or admin). */
@Controller('news')
@UseGuards(JwtAuthGuard)
export class NewsController {
  constructor(private readonly news: NewsService) {}
  @Get() feed(@Query() query: NewsFeedQuery) { return this.news.feed(query); }
  @Get(':id') get(@Param('id') id: string) { return this.news.getPublished(id); }
}

/** Writing the feed: administrators only. Images use the existing content image upload (POST /admin/uploads/content-image). */
@Controller('admin/news')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminNewsController {
  constructor(private readonly news: NewsService) {}
  @Get() list() { return this.news.listAll(); }
  @Post() create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: NewsPostDto) { return this.news.create(actor.id, dto); }
  @Put(':id') update(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: NewsPostDto) { return this.news.update(actor.id, id, dto); }
  @Patch(':id') flags(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: NewsFlagsDto) { return this.news.setFlags(actor.id, id, dto); }
  @Delete(':id') remove(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.news.remove(actor.id, id); }
}
