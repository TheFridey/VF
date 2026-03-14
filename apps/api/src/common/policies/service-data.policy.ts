import { Injectable } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

export enum ServiceDataAction {
  VIEW_OWN = 'view_own',
  EDIT_OWN = 'edit_own',
  VIEW_OTHERS_INDICATOR = 'view_others_indicator',
  VIEW_OTHERS_FULL = 'view_others_full',
  SEARCH = 'search',
}

@Injectable()
export class ServiceDataPolicy {
  private readonly permissions: Record<UserRole, ServiceDataAction[]> = {
    [UserRole.VETERAN_UNVERIFIED]: [
      ServiceDataAction.VIEW_OWN,
      ServiceDataAction.EDIT_OWN,
    ],
    [UserRole.VETERAN_VERIFIED]: [
      ServiceDataAction.VIEW_OWN,
      ServiceDataAction.EDIT_OWN,
      ServiceDataAction.VIEW_OTHERS_INDICATOR,
      ServiceDataAction.SEARCH,
    ],
    [UserRole.VETERAN_MEMBER]: [
      ServiceDataAction.VIEW_OWN,
      ServiceDataAction.EDIT_OWN,
      ServiceDataAction.VIEW_OTHERS_INDICATOR,
      ServiceDataAction.VIEW_OTHERS_FULL,
      ServiceDataAction.SEARCH,
    ],
    [UserRole.MODERATOR]: [
      ServiceDataAction.VIEW_OWN,
      ServiceDataAction.EDIT_OWN,
      ServiceDataAction.VIEW_OTHERS_INDICATOR,
      ServiceDataAction.VIEW_OTHERS_FULL,
      ServiceDataAction.SEARCH,
    ],
    [UserRole.ADMIN]: [
      ServiceDataAction.VIEW_OWN,
      ServiceDataAction.EDIT_OWN,
      ServiceDataAction.VIEW_OTHERS_INDICATOR,
      ServiceDataAction.VIEW_OTHERS_FULL,
      ServiceDataAction.SEARCH,
    ],
  };

  can(role: UserRole, action: ServiceDataAction): boolean {
    return this.permissions[role]?.includes(action) ?? false;
  }

  canViewOthersServiceData(role: UserRole): boolean {
    return this.can(role, ServiceDataAction.VIEW_OTHERS_INDICATOR) ||
           this.can(role, ServiceDataAction.VIEW_OTHERS_FULL);
  }

  getViewLevel(role: UserRole): 'none' | 'indicator' | 'full' {
    if (this.can(role, ServiceDataAction.VIEW_OTHERS_FULL)) return 'full';
    if (this.can(role, ServiceDataAction.VIEW_OTHERS_INDICATOR)) return 'indicator';
    return 'none';
  }
}
