import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const MIN_ROLE_KEY = 'minRole';
export const MinRole = (role: string) => SetMetadata(MIN_ROLE_KEY, role);
