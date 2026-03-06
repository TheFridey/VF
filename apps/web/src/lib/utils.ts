import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, differenceInYears } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function calculateAge(birthDate: string | Date): number {
  return differenceInYears(new Date(), new Date(birthDate));
}

export function formatBranch(branch: string): string {
  const branches: Record<string, string> = {
    // UK Branches
    BRITISH_ARMY: 'British Army',
    ROYAL_NAVY: 'Royal Navy',
    ROYAL_AIR_FORCE: 'Royal Air Force',
    ROYAL_MARINES: 'Royal Marines',
    RESERVE_FORCES: 'Reserve Forces',
    TERRITORIAL_ARMY: 'Territorial Army',
    // US Branches (for compatibility)
    ARMY: 'Army',
    NAVY: 'Navy',
    AIR_FORCE: 'Air Force',
    MARINE_CORPS: 'Marine Corps',
    COAST_GUARD: 'Coast Guard',
    SPACE_FORCE: 'Space Force',
    NATIONAL_GUARD: 'National Guard',
    OTHER: 'Other',
  };
  return branches[branch] || branch;
}

export function formatGender(gender: string): string {
  const genders: Record<string, string> = {
    MALE: 'Male',
    FEMALE: 'Female',
    NON_BINARY: 'Non-binary',
    OTHER: 'Other',
    PREFER_NOT_TO_SAY: 'Prefer not to say',
  };
  return genders[gender] || gender;
}

export function formatRole(role: string): string {
  const roles: Record<string, string> = {
    CIVILIAN: 'Civilian',
    VETERAN_UNVERIFIED: 'Veteran (Unverified)',
    VETERAN_VERIFIED: 'Verified Veteran',
    VETERAN_PAID: 'Premium Veteran',
    MODERATOR: 'Moderator',
    ADMIN: 'Administrator',
  };
  return roles[role] || role;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function isVeteran(role: string): boolean {
  return ['VETERAN_UNVERIFIED', 'VETERAN_VERIFIED', 'VETERAN_PAID'].includes(role);
}

export function isVerifiedVeteran(role: string): boolean {
  return ['VETERAN_VERIFIED', 'VETERAN_PAID'].includes(role);
}
