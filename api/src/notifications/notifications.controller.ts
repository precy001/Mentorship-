import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQuery } from './notifications.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get() list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsQuery) {
    return this.notifications.list(user.id, { limit: query.limit, before: query.before, unreadOnly: query.unread === 'true' });
  }
  @Get('unread-count') unreadCount(@CurrentUser() user: AuthenticatedUser) { return this.notifications.unreadCount(user.id); }
  // Declared before ':id/read' so "read-all" is never treated as an id.
  @Post('read-all') readAll(@CurrentUser() user: AuthenticatedUser) { return this.notifications.markAllRead(user.id); }
  @Post(':id/read') read(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.notifications.markRead(user.id, id); }
}
