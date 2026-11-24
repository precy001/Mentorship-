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
import { ServiceAreasService } from '../service-areas/service-areas.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, RefreshTokenDto, ResetPasswordDto, VerifyEmailDto } from './dto/token.dto';
import type { AuthenticatedUser } from './decorators/current-user.decorator';

const BCRYPT_ROUNDS = 12;
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** A just-rotated refresh token may be replayed briefly (a retry after a dropped response) without revoking the session. */
const REFRESH_REUSE_GRACE_MS = 30 * 1000;
const ACCESS_TOKEN_SECONDS = 900;

type StoredProfileData = { lga?: unknown; lcda?: unknown; school?: unknown; nin?: unknown };

function getStoredProfileData(value: unknown): { lga: string | null; lcda: string | null; school: string | null; nin: string | null } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { lga: null, lcda: null, school: null, nin: null };
  }
  const data = value as StoredProfileData;
  return {
    lga: typeof data.lga === 'string' ? data.lga : null,
    lcda: typeof data.lcda === 'string' ? data.lcda : null,
    school: typeof data.school === 'string' ? data.school : null,
    nin: typeof data.nin === 'string' ? data.nin : null,
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
    private readonly serviceAreas: ServiceAreasService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new ConflictException('An account with this email already exists.');

    // The selected area must exist and be enabled right now; the stored (canonical) values are saved.
    const area = await this.serviceAreas.resolveActiveArea(dto.stateOfResidence, dto.lga, dto.lcda);

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
          stateOfResidence: area.state,
          profileData: { lga: area.lga, lcda: area.lcda, school: dto.school?.trim() || null, nin: dto.nin },
        } },
      },
      select: { id: true, email: true },
    });

    await this.createAndSendToken(user.id, user.email, AuthTokenType.EMAIL_VERIFICATION, EMAIL_TOKEN_TTL_MS);
    await this.writeAudit(user.id, 'AUTH_REGISTERED', 'User', user.id);
    return { message: 'Account created. Check your email for a verification link before signing in.' };
  }

  async login(dto: LoginDto) {
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
    const refreshToken = await this.issueRefreshToken(user.id);
    await this.writeAudit(user.id, 'AUTH_LOGIN_SUCCEEDED', 'User', user.id);
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer' as const,
      expiresIn: ACCESS_TOKEN_SECONDS,
      user: {
        id: user.id, email: user.email, role: user.role, status: user.status, displayName: user.displayName, welcomeSeenAt: user.welcomeSeenAt,
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

  /** Rotates a refresh token and returns a new access token, so a session survives the 15-minute access-token lifetime. */
  async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);
    const stored = await this.prisma.authToken.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, email: true, role: true, status: true, emailVerifiedAt: true } } } });
    const invalid = () => new UnauthorizedException('Your session has expired. Please sign in again.');
    if (!stored || stored.type !== AuthTokenType.REFRESH_SESSION) throw invalid();
    if (stored.consumedAt) {
      // Replay of an already-rotated token outside the grace window suggests theft: end every session for this account.
      if (Date.now() - stored.consumedAt.getTime() > REFRESH_REUSE_GRACE_MS) {
        await this.prisma.authToken.updateMany({ where: { userId: stored.userId, type: AuthTokenType.REFRESH_SESSION, consumedAt: null }, data: { consumedAt: new Date() } });
        await this.writeAudit(stored.userId, 'AUTH_REFRESH_REUSE_DETECTED', 'User', stored.userId);
      }
      throw invalid();
    }
    if (stored.expiresAt <= new Date()) throw invalid();
    if (stored.user.status !== UserStatus.ACTIVE || !stored.user.emailVerifiedAt) throw invalid();

    // Only one caller can consume the token; a concurrent second caller gets count 0.
    const consumed = await this.prisma.authToken.updateMany({ where: { id: stored.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (consumed.count !== 1) throw invalid();

    const accessToken = await this.jwt.signAsync({ sub: stored.user.id, email: stored.user.email, role: stored.user.role });
    const refreshToken = await this.issueRefreshToken(stored.user.id);
    return { accessToken, refreshToken, tokenType: 'Bearer' as const, expiresIn: ACCESS_TOKEN_SECONDS };
  }

  /** Ends the session that owns this refresh token. Always succeeds so a client can sign out while offline-ish or expired. */
  async logout(dto: RefreshTokenDto): Promise<{ message: string }> {
    await this.prisma.authToken.updateMany({ where: { tokenHash: this.hashToken(dto.refreshToken), type: AuthTokenType.REFRESH_SESSION, consumedAt: null }, data: { consumedAt: new Date() } });
    return { message: 'Signed out.' };
  }

  /** Stamps the one-time welcome as seen. Idempotent: the first timestamp is kept. */
  async markWelcomeSeen(userId: string): Promise<{ welcomeSeenAt: Date }> {
    await this.prisma.user.updateMany({ where: { id: userId, welcomeSeenAt: null }, data: { welcomeSeenAt: new Date() } });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { welcomeSeenAt: true } });
    if (!user?.welcomeSeenAt) throw new UnauthorizedException('Your account could not be found. Please sign in again.');
    return { welcomeSeenAt: user.welcomeSeenAt };
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = randomBytes(48).toString('base64url');
    await this.prisma.authToken.create({ data: { userId, type: AuthTokenType.REFRESH_SESSION, tokenHash: this.hashToken(rawToken), expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) } });
    // Opportunistic clean-up keeps the table small without a scheduler.
    void this.prisma.authToken.deleteMany({ where: { userId, type: AuthTokenType.REFRESH_SESSION, expiresAt: { lt: new Date() } } }).catch(() => undefined);
    return rawToken;
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
      this.prisma.userNotification.create({
        data: { userId: token.userId, type: 'ACCOUNT', title: 'Welcome to Mentorship+', body: 'Your email is verified. Explore resources, start a private discussion with a mentor, or book a session.' },
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
      // A password reset signs the account out everywhere.
      this.prisma.authToken.updateMany({ where: { userId: token.userId, type: AuthTokenType.REFRESH_SESSION, consumedAt: null }, data: { consumedAt: now } }),
    ]);
    await this.writeAudit(token.userId, 'AUTH_PASSWORD_RESET', 'User', token.userId);
    return { message: 'Password updated. Sign in using your new password.' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, role: true, status: true, displayName: true, emailVerifiedAt: true, welcomeSeenAt: true,
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
