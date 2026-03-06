// Match entity - using Prisma
import { Match as PrismaMatch, MatchType, MatchStatus } from '@prisma/client';

export type Match = PrismaMatch;
export { MatchType, MatchStatus };
