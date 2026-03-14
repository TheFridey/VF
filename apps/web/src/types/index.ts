export type UserRole =
  | 'VETERAN_UNVERIFIED'
  | 'VETERAN_VERIFIED'
  | 'VETERAN_MEMBER'
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
  | 'BRITISH_ARMY'
  | 'ROYAL_NAVY'
  | 'ROYAL_AIR_FORCE'
  | 'ROYAL_MARINES'
  | 'RESERVE_FORCES'
  | 'TERRITORIAL_ARMY'
  | 'ARMY'
  | 'NAVY'
  | 'AIR_FORCE'
  | 'MARINE_CORPS'
  | 'COAST_GUARD'
  | 'SPACE_FORCE'
  | 'NATIONAL_GUARD';

export type ConnectionType   = 'BROTHERS_IN_ARMS' | 'COMMUNITY';
export type ConnectionStatus = 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';


export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  profile?: Profile;
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

export interface Connection {
  id: string;
  connectionType: ConnectionType;
  status: ConnectionStatus;
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
  connectionId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  readAt?: string;
  editedAt?: string;
  isOwn: boolean;
}

export interface Conversation {
  connectionId: string;
  connectionType: ConnectionType;
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

export interface BrothersCandidate {
  id: string;
  displayName: string;
  bio?: string;
  location?: string;
  profileImageUrl?: string;
  interests: string[];
  overlapScore: number;
  veteranInfo?: {
    branch: MilitaryBranch;
    rank?: string;
    isVerified: boolean;
  };
  overlapReasons?: string[];
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
