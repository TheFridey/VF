// Connection entity (formerly Match)
import { ConnectionType, ConnectionStatus } from '../../common/enums/connection.enum';

export { ConnectionType, ConnectionStatus };
export { ConnectionType as MatchType, ConnectionStatus as MatchStatus };

export interface Connection {
  id: string;
  user1Id: string;
  user2Id: string;
  connectionType: ConnectionType;
  status: ConnectionStatus;
  overlapScore?: number;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Backward-compat alias
export type Match = Connection;
