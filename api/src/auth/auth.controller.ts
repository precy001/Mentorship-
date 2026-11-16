import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, RefreshTokenDto, ResetPasswordDto, VerifyEmailDto } from './dto/token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from './decorators/current-user.decorator';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';

const MINUTE = 60_000;

/** Public endpoints are rate limited per client address to slow down password guessing, token guessing and email abuse. */
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @RateLimit(10, 10 * MINUTE)
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @RateLimit(10, 5 * MINUTE)
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @RateLimit(60, 5 * MINUTE)
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto);
  }

  @Post('logout')
  @RateLimit(60, 5 * MINUTE)
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto);
  }

  @Post('verify-email')
  @RateLimit(20, 10 * MINUTE)
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Post('resend-verification')
  @RateLimit(5, 10 * MINUTE)
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ForgotPasswordDto) {
    return this.auth.resendVerification(dto);
  }

  @Post('forgot-password')
  @RateLimit(5, 10 * MINUTE)
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  @RateLimit(10, 10 * MINUTE)
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getMe(user.id);
  }

  @Post('welcome-seen')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  welcomeSeen(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.markWelcomeSeen(user.id);
  }
}
