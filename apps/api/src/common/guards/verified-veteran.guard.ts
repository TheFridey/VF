import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { isVerifiedVeteran, isStaff } from '../enums/user-role.enum';

@Injectable()
export class VerifiedVeteranGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!isVerifiedVeteran(user.role) && !isStaff(user.role)) {
      throw new ForbiddenException('Verified veteran status required');
    }

    return true;
  }
}
