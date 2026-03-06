import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

export const RESOURCE_OWNER_KEY = 'resourceOwner';

export interface ResourceOwnerOptions {
  paramName?: string; // URL param name (default: 'id')
  allowAdmin?: boolean; // Allow admin to bypass ownership check
  allowModerator?: boolean; // Allow moderator to bypass ownership check
}

@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<ResourceOwnerOptions>(
      RESOURCE_OWNER_KEY,
      context.getHandler(),
    ) || {};

    const { user } = context.switchToHttp().getRequest();
    const request = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin bypass
    if (options.allowAdmin && user.role === 'admin') {
      return true;
    }

    // Moderator bypass
    if (options.allowModerator && (user.role === 'moderator' || user.role === 'admin')) {
      return true;
    }

    // Check ownership
    const paramName = options.paramName || 'userId';
    const resourceUserId = request.params[paramName];

    // If accessing own resource (using 'me' or own user ID)
    if (resourceUserId === 'me' || resourceUserId === user.id) {
      return true;
    }

    throw new ForbiddenException('You can only access your own resources');
  }
}
