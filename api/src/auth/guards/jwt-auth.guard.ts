import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

interface JwtPayload { sub: string; email: string; role: string; }
type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Authentication required.');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    if (!payload.sub) throw new UnauthorizedException('Invalid access token.');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true, emailVerifiedAt: true },
    });
    if (!user || user.status !== 'ACTIVE' || !user.emailVerifiedAt) {
      throw new UnauthorizedException('This account cannot access protected resources.');
    }
    request.user = { id: user.id, email: user.email, role: user.role, status: user.status };
    return true;
  }
}
