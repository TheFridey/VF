export type MembershipTier = 'FREE' | 'BIA_BASIC' | 'BIA_PLUS' | string | null | undefined;

export function isStaffRole(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'MODERATOR';
}

export function isVerifiedVeteranRole(role?: string | null): boolean {
  return role === 'VETERAN_VERIFIED' || role === 'VETERAN_MEMBER';
}

export function hasBiaForumAccess(role?: string | null, tier?: MembershipTier): boolean {
  return isStaffRole(role) || tier === 'BIA_BASIC' || tier === 'BIA_PLUS';
}

export function hasBiaPlusAccess(role?: string | null, tier?: MembershipTier): boolean {
  return isStaffRole(role) || tier === 'BIA_PLUS';
}

export function getBiaAccessState(role?: string | null, tier?: MembershipTier) {
  const isStaff = isStaffRole(role);
  const isVerifiedVeteran = isVerifiedVeteranRole(role);

  return {
    isStaff,
    isVerifiedVeteran,
    canSeeBia: isStaff || isVerifiedVeteran,
    hasForumsAccess: hasBiaForumAccess(role, tier),
    hasBiaPlusAccess: hasBiaPlusAccess(role, tier),
  };
}
