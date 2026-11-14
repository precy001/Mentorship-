import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateRatingDto, ModerateRatingDto } from './ratings.dto';
import { RatingsService } from './ratings.service';
@Controller('ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}
  @Post() @Roles('MEMBER') create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRatingDto) { return this.ratings.create(user, dto); }
  @Get('mine') @Roles('MEMBER') mine(@CurrentUser() user: AuthenticatedUser) { return this.ratings.listMine(user.id); }
  @Get('pending') @Roles('ADMIN', 'SUPER_ADMIN') pending() { return this.ratings.listPending(); }
  @Patch(':id/moderation') @Roles('ADMIN', 'SUPER_ADMIN') moderate(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: ModerateRatingDto) { return this.ratings.moderate(actor, id, dto.status); }
}
