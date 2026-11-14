import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CounsellorAvailability, UserRole, UserStatus } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { AcceptCounsellorInvitationDto, AccountStatusDto, CounsellorAvailabilityDto, CounsellorInvitationDto, ResourceDto, ScholarshipDto, TopicActiveDto, TopicAssignmentDto, TopicDto, UserRoleDto } from './admin.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
  @Get('users') users(@Query('search') search?: string) { return this.admin.listUsers(search); }
  @Patch('users/:id/status') setStatus(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: AccountStatusDto) { return this.admin.setAccountStatus(actor, id, dto.status as UserStatus); }
  @Patch('users/:id/role') setRole(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: UserRoleDto) { return this.admin.setRole(actor, id, dto.role as UserRole); }
  @Post('counsellors/invitations') inviteCounsellor(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CounsellorInvitationDto) { return this.admin.inviteCounsellor(actor, dto.email, dto.topicIds); }
  @Post('counsellors/invitations/accept')
  @Roles('MEMBER', 'COUNSELLOR')
  acceptCounsellorInvitation(@CurrentUser() user: AuthenticatedUser, @Body() body: AcceptCounsellorInvitationDto) { return this.admin.acceptCounsellorInvitation(user, body.token); }
  @Get('resources') resources() { return this.admin.listResources(); }
  @Post('resources') createResource(@CurrentUser() actor: AuthenticatedUser, @Body() dto: ResourceDto) { return this.admin.createResource(actor.id, dto); }
  @Patch('resources/:id/active') resourceActive(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: TopicActiveDto) { return this.admin.setResourceActive(actor.id, id, body.isActive); }
  @Get('scholarships') scholarships() { return this.admin.listScholarships(); }
  @Post('scholarships') createScholarship(@CurrentUser() actor: AuthenticatedUser, @Body() dto: ScholarshipDto) { return this.admin.createScholarship(actor.id, dto); }
  @Patch('scholarships/:id/active') scholarshipActive(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: TopicActiveDto) { return this.admin.setScholarshipActive(actor.id, id, body.isActive); }
  @Get('service-areas') serviceAreas() { return this.admin.listServiceAreas(); }
  @Patch('service-areas/:id/active') serviceAreaActive(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: TopicActiveDto) { return this.admin.setServiceAreaActive(actor.id, id, body.isActive); }
  @Get('appointments') appointments() { return this.admin.listAppointments(); }
  @Get('audit-logs') auditLogs() { return this.admin.listAuditLogs(); }
  @Get('discussions/unassigned') unassignedDiscussions() { return this.admin.listUnassignedDiscussions(); }
  @Post('discussions/:id/auto-assign') autoAssign(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) { return this.admin.autoAssignDiscussion(actor, id); }
  @Get('topics') topics() { return this.admin.listTopics(); }
  @Post('topics') createTopic(@CurrentUser() actor: AuthenticatedUser, @Body() dto: TopicDto) { return this.admin.createTopic(actor.id, dto.name, dto.description); }
  @Patch('topics/:id/active') topicActive(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: TopicActiveDto) { return this.admin.setTopicActive(actor.id, id, body.isActive); }
  @Patch('counsellors/:userId/topics') assignTopics(@CurrentUser() actor: AuthenticatedUser, @Param('userId') userId: string, @Body() dto: TopicAssignmentDto) { return this.admin.assignTopics(actor, userId, dto.topicIds); }
  @Patch('counsellors/:userId/availability') availability(@CurrentUser() actor: AuthenticatedUser, @Param('userId') userId: string, @Body() body: CounsellorAvailabilityDto) { return this.admin.counsellorAvailability(actor, userId, body.availability as CounsellorAvailability); }
}
