import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'required_roles';
export type AppRole = 'MEMBER' | 'COUNSELLOR' | 'ADMIN' | 'SUPER_ADMIN';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
