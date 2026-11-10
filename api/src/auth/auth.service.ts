import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenType, UserRole, UserStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './dto/token.dto';
import type { AuthenticatedUser } from './decorators/current-user.decorator';

const BCRYPT_ROUNDS = 12;
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

type StoredProfileData = { lga?: unknown; lcda?: unknown; school?: unknown };

function getStoredProfileData(value: unknown): { lga: string | null; lcda: string | null; school: string | null } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { lga: null, lcda: null, school: null };
  }
  const data = value as StoredProfileData;
  return {
    lga: typeof data.lga === 'string' ? data.lga : null,
    lcda: typeof data.lcda === 'string' ? data.lcda : null,
    school: typeof data.school === 'string' ? data.school : null,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new ConflictException('An account with this email already exists.');

    const category = await this.prisma.membershipCategory.findFirst({ where: { id: dto.categoryId, isActive: true }, select: { id: true } });
    const subcategory = await this.prisma.membershipSubcategory.findFirst({ where: { id: dto.subcategoryId, categoryId: dto.categoryId, isActive: true }, select: { id: true } });
    if (!category || !subcategory) throw new BadRequestException('Choose a valid category and a matching subcategory.');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName.trim(),
        role: UserRole.MEMBER,
        status: UserStatus.PENDING_VERIFICATION,
        profile: { create: {
          categoryId: dto.categoryId,
          subcategoryId: dto.subcategoryId,
          phoneNumber: dto.phoneNumber?.trim(),
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          stateOfResidence: dto.stateOfResidence?.trim(),
          profileData: { lga: dto.lga?.trim() || null, lcda: dto.lcda?.trim() || null, school: dto.school?.trim() || null },
        } },
      },
      select: { id: true, email: true },
    });

    await this.createAndSendToken(user.id, user.email, AuthTokenType.EMAIL_VERIFICATION, EMAIL_TOKEN_TTL_MS);
    await this.writeAudit(user.id, 'AUTH_REGISTERED', 'User', user.id);
    return { message: 'Account created. Check your email for a verification link before signing in.' };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; tokenType: 'Bearer'; expiresIn: number; user: AuthenticatedUser & { displayName: string | null; profile: { avatarUrl: string | null; phoneNumber: string | null; dateOfBirth: Date | null; stateOfResidence: string | null; lga: string | null; lcda: string | null; school: string | null; category: { id: string; name: string; slug: string } | null; subcategory: { id: string; name: string; slug: string } | null } | null } }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: { include: { category: true, subcategory: true } } },
    });
    const passwordMatches = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !passwordMatches) throw new UnauthorizedException('Email or password is incorrect.');
    if (!user.emailVerifiedAt || user.status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Your email address has not been verified. Open your verification email or request a new link.');
    }
    if (user.status === UserStatus.SUSPENDED) throw new UnauthorizedException('This account has been suspended. Contact support for assistance.');
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('This account is not active. Contact support for assistance.');

    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    await this.writeAudit(user.id, 'AUTH_LOGIN_SUCCEEDED', 'User', user.id);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: user.id, email: user.email, role: user.role, status: user.status, displayName: user.displayName,
        profile: user.profile ? {
          avatarUrl: user.profile.avatarUrl,
          phoneNumber: user.profile.phoneNumber,
          dateOfBirth: user.profile.dateOfBirth,
          stateOfResidence: user.profile.stateOfResidence,
          ...getStoredProfileData(user.profile.profileData),
          category: user.profile.category ? { id: user.profile.category.id, name: user.profile.category.name, slug: user.profile.category.slug } : null,
          subcategory: user.profile.subcategory ? { id: user.profile.subcategory.id, name: user.profile.subcategory.name, slug: user.profile.subcategory.slug } : null,
        } : null,
      },
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const token = await this.prisma.authToken.findUnique({ where: { tokenHash } });
    if (!token || token.type !== AuthTokenType.EMAIL_VERIFICATION || token.consumedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException('This verification link is invalid or has expired. Request a new one.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: new Date(), status: UserStatus.ACTIVE },
      }),
      this.prisma.authToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
      this.prisma.authToken.updateMany({
        where: { userId: token.userId, type: AuthTokenType.EMAIL_VERIFICATION, consumedAt: null, id: { not: token.id } },
        data: { consumedAt: new Date() },
      }),
    ]);
    await this.writeAudit(token.userId, 'AUTH_EMAIL_VERIFIED', 'User', token.userId);
    return { message: 'Email verified. You can now sign in.' };
  }

  async resendVerification(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerifiedAt: true, status: true } });
    if (user && !user.emailVerifiedAt && user.status === UserStatus.PENDING_VERIFICATION) {
      await this.createAndSendToken(user.id, user.email, AuthTokenType.EMAIL_VERIFICATION, EMAIL_TOKEN_TTL_MS);
    }
    return { message: 'If the account exists and needs verification, a new verification email will be sent.' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerifiedAt: true, status: true } });
    if (user && user.emailVerifiedAt && user.status === UserStatus.ACTIVE) {
      await this.createAndSendToken(user.id, user.email, AuthTokenType.PASSWORD_RESET, RESET_TOKEN_TTL_MS);
    }
    return { message: 'If an eligible account exists, password-reset instructions will be sent.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const token = await this.prisma.authToken.findUnique({ where: { tokenHash } });
    if (!token || token.type !== AuthTokenType.PASSWORD_RESET || token.consumedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException('This password-reset link is invalid or has expired.');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }),
      this.prisma.authToken.update({ where: { id: token.id }, data: { consumedAt: now } }),
      this.prisma.authToken.updateMany({
        where: { userId: token.userId, type: AuthTokenType.PASSWORD_RESET, consumedAt: null, id: { not: token.id } },
        data: { consumedAt: now },
      }),
    ]);
    await this.writeAudit(token.userId, 'AUTH_PASSWORD_RESET', 'User', token.userId);
    return { message: 'Password updated. Sign in using your new password.' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, role: true, status: true, displayName: true, emailVerifiedAt: true,
        profile: { select: {
          avatarUrl: true,
          phoneNumber: true,
          dateOfBirth: true,
          stateOfResidence: true,
          profileData: true,
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
        } },
      },
    });
    if (!user) throw new UnauthorizedException('Your account could not be found. Please sign in again.');
    if (!user.profile) return user;
    const { profileData, ...profile } = user.profile;
    return {
      ...user,
      profile: {
        ...profile,
        ...getStoredProfileData(profileData),
      },
    };
  }

  private async createAndSendToken(userId: string, email: string, type: AuthTokenType, ttlMs: number): Promise<void> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.authToken.updateMany({
        where: { userId, type, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.prisma.authToken.create({
        data: { userId, type, tokenHash, expiresAt: new Date(now.getTime() + ttlMs) },
      }),
    ]);
    const isVerification = type === AuthTokenType.EMAIL_VERIFICATION;
    const defaultUrl = isVerification ? 'guidanceplus://verify' : 'guidanceplus://reset-password';
    const configuredUrl = this.config
      .get<string>(isVerification ? 'AUTH_VERIFICATION_URL' : 'AUTH_PASSWORD_RESET_URL')
      ?.trim();
    // Backwards compatibility: the legacy variable only ever represented the
    // verification URL. It must not redirect password-reset tokens to /verify.
    const legacyVerificationUrl = isVerification
      ? this.config.get<string>('AUTH_ACTION_BASE_URL')?.trim()
      : undefined;
    const base = (configuredUrl || legacyVerificationUrl || defaultUrl).replace(/\/$/, '');
    const actionUrl = `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(rawToken)}`;
    await this.mail.sendActionEmail(
      email,
      type === AuthTokenType.EMAIL_VERIFICATION ? 'Verify your Mentorship+ email' : 'Reset your Mentorship+ password',
      actionUrl,
      type === AuthTokenType.EMAIL_VERIFICATION ? 'verify' : 'reset',
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async writeAudit(actorId: string, action: string, entityType: string, entityId: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: { actorId, action, entityType, entityId } });
    } catch (error) {
      // Authentication must not fail because audit logging is temporarily unavailable.
      this.logger.error(`Audit write failed for ${action}; investigate database health.`, error instanceof Error ? error.stack : undefined);
    }
  }
}
