export enum UserRole {
  CIVILIAN = 'CIVILIAN',
  VETERAN_UNVERIFIED = 'VETERAN_UNVERIFIED',
  VETERAN_VERIFIED = 'VETERAN_VERIFIED',
  VETERAN_PAID = 'VETERAN_PAID',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

// Role hierarchy for comparison
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CIVILIAN]: 1,
  [UserRole.VETERAN_UNVERIFIED]: 2,
  [UserRole.VETERAN_VERIFIED]: 3,
  [UserRole.VETERAN_PAID]: 4,
  [UserRole.MODERATOR]: 5,
  [UserRole.ADMIN]: 6,
};

export function isRoleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isVerifiedVeteran(role: UserRole): boolean {
  return role === UserRole.VETERAN_VERIFIED || role === UserRole.VETERAN_PAID;
}

export function isAnyVeteran(role: UserRole): boolean {
  return [
    UserRole.VETERAN_UNVERIFIED,
    UserRole.VETERAN_VERIFIED,
    UserRole.VETERAN_PAID,
  ].includes(role);
}

export function isStaff(role: UserRole): boolean {
  return role === UserRole.MODERATOR || role === UserRole.ADMIN;
}

export function isPaidVeteran(role: UserRole): boolean {
  return role === UserRole.VETERAN_PAID;
}
