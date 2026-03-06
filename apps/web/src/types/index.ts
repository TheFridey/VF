export type UserRole =
  | 'CIVILIAN'
  | 'VETERAN_UNVERIFIED'
  | 'VETERAN_VERIFIED'
  | 'VETERAN_PAID'
  | 'MODERATOR'
  | 'ADMIN';

export type UserStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'BANNED'
  | 'PENDING_DELETION'
  | 'DELETED';

export type Gender = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export type MilitaryBranch =
  | 'ARMY'
  | 'NAVY'
  | 'AIR_FORCE'
  | 'MARINE_CORPS'
  | 'COAST_GUARD'
  | 'SPACE_FORCE'
  | 'NATIONAL_GUARD';

export type MatchType = 'BROTHERS';
export type MatchStatus = 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  displayName?: string;
  bio?: string;
  gender?: Gender;
  dateOfBirth?: string;
  location?: string;
  profileImageUrl?: string;
  lookingFor: Gender[];
  interests: string[];
  isVisible: boolean;
}

export interface VeteranDetails {
  id: string;
  userId: string;
  branch?: MilitaryBranch;
  rank?: string;
  mos?: string;
  dutyStations: string[];
  deployments: string[];
}

export interface ServicePeriod {
  id: string;
  branch: MilitaryBranch;
  startDate: string;
  endDate?: string;
  unit?: string;
  dutyStation?: string;
}

export interface Match {
  id: string;
  matchType: MatchType;
  status: MatchStatus;
  overlapScore?: number;
  lastMessageAt?: string;
  createdAt: string;
  otherUser: {
    id: string;
    displayName: string;
    profileImageUrl?: string;
  };
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  readAt?: string;
  editedAt?: string;
  isOwn: boolean;
}

export interface Conversation {
  matchId: string;
  matchType: MatchType;
  otherUser: {
    id: string;
    displayName: string;
    profileImageUrl?: string;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  };
  createdAt: string;
}

export interface DiscoveryCandidate {
  id: string;
  displayName: string;
  bio?: string;
  age: number;
  location?: string;
  profileImageUrl?: string;
  interests: string[];
  isVeteran: boolean;
  veteranInfo?: {
    branch: MilitaryBranch;
    rank?: string;
    isVerified: boolean;
  };
}

export interface BrothersCandidate extends DiscoveryCandidate {
  overlapScore: number;
  overlappingPeriods: {
    branch: MilitaryBranch;
    dateRange: string;
    location?: string;
  }[];
}

export type ReportReason =
  | 'FAKE_PROFILE'
  | 'HARASSMENT'
  | 'INAPPROPRIATE_CONTENT'
  | 'SPAM'
  | 'SCAM'
  | 'IMPERSONATION'
  | 'UNDERAGE'
  | 'OTHER';
