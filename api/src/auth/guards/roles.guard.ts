import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, type AppRole } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import type { Request } from 'express';

type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<RequestWithUser>().user;
    if (!user || !required.includes(user.role)) throw new ForbiddenException('You do not have permission to perform this action.');
    return true;
  }
}
