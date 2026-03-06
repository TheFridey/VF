import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY, MIN_ROLE_KEY } from '../decorators/roles.decorator';

// Role hierarchy for comparison
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CIVILIAN]: 1,
  [UserRole.VETERAN_UNVERIFIED]: 2,
  [UserRole.VETERAN_VERIFIED]: 3,
  [UserRole.VETERAN_PAID]: 4,
  [UserRole.MODERATOR]: 5,
  [UserRole.ADMIN]: 6,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(UserRole | string)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const minRole = this.reflector.getAllAndOverride<UserRole | string>(MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && !minRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const userRole = user.role as UserRole;

    // Check minimum role
    if (minRole) {
      const minRoleValue = ROLE_HIERARCHY[minRole as UserRole];
      const userRoleValue = ROLE_HIERARCHY[userRole];
      if (userRoleValue < minRoleValue) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Check specific roles
    if (requiredRoles) {
      const normalizedRequired = requiredRoles.map(r => r.toString().toUpperCase());
      if (!normalizedRequired.includes(userRole.toString().toUpperCase())) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
