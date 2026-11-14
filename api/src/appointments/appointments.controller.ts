import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { AppointmentStatusDto, CreateAppointmentDto } from './appointments.dto';
@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.appointments.list(user); }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) { return this.appointments.create(user, dto); }
  @Patch(':id/status') update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AppointmentStatusDto) { return this.appointments.updateStatus(user, id, dto.status as AppointmentStatus); }
}
