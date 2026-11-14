import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CounsellorAvailability, DiscussionStatus } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DiscussionsService } from './discussions.service';
import { CreateDiscussionDto, DiscussionStatusDto, SendMessageDto } from './discussions.dto';
@Controller('discussions')
@UseGuards(JwtAuthGuard)
export class DiscussionsController {
  constructor(private readonly discussions: DiscussionsService) {}
  @Get('counsellor/me') counsellorMe(@CurrentUser() user: AuthenticatedUser) { return this.discussions.counsellorProfile(user.id); }
  @Patch('counsellor/availability') setAvailability(@CurrentUser() user: AuthenticatedUser, @Body() body: { availability: CounsellorAvailability }) { return this.discussions.setCounsellorAvailability(user.id, body.availability); }
  @Get('topics') topics() { return this.discussions.listTopics(); }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDiscussionDto) { return this.discussions.create(user, dto); }
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.discussions.list(user); }
  @Get(':id') get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.discussions.get(user, id); }
  @Post(':id/messages') message(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SendMessageDto) { return this.discussions.sendMessage(user, id, dto.body); }
  @Patch(':id/status') status(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DiscussionStatusDto) { return this.discussions.updateStatus(user, id, dto.status as DiscussionStatus); }
}
