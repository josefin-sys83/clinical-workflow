import { SetMetadata } from '@nestjs/common';

export type Role = 'admin' | 'author' | 'reviewer' | 'approver';
export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
