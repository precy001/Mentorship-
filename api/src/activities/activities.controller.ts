import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './activities.dto';
@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser, @Query('type') type?: string) { return this.activities.list(user.id, type); }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateActivityDto) { return this.activities.create(user.id, dto.type, dto.payload); }
  @Patch(':id') update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateActivityDto) { if (dto.type !== 'PERSONAL_GOAL') throw new BadRequestException('Only personal goals can be updated.'); return this.activities.update(user.id, id, dto.type, dto.payload); }
  @Get('notifications') notifications(@CurrentUser() user: AuthenticatedUser) { return this.activities.notifications(user.id); }
  @Post('notifications/:id/read') markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.activities.markNotificationRead(user.id, id); }
}
