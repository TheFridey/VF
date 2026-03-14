export enum UserRole {
  VETERAN_UNVERIFIED  = 'VETERAN_UNVERIFIED',
  VETERAN_VERIFIED    = 'VETERAN_VERIFIED',
  VETERAN_MEMBER      = 'VETERAN_MEMBER',
  MODERATOR           = 'MODERATOR',
  ADMIN               = 'ADMIN',
}

export function isVerifiedVeteran(role: string): boolean {
  return role === UserRole.VETERAN_VERIFIED || role === UserRole.VETERAN_MEMBER;
}

export function isStaff(role: string): boolean {
  return role === UserRole.MODERATOR || role === UserRole.ADMIN;
}

export function isVeteran(role: string): boolean {
  return (
    role === UserRole.VETERAN_UNVERIFIED ||
    role === UserRole.VETERAN_VERIFIED ||
    role === UserRole.VETERAN_MEMBER
  );
}
