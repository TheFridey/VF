// Legacy — kept for reference during migration.
// New code should use ConnectionType from @prisma/client.
export enum ConnectionType {
  BROTHERS_IN_ARMS = 'BROTHERS_IN_ARMS',
  COMMUNITY        = 'COMMUNITY',
}

/** @deprecated Use ConnectionType */
export enum MatchType {
  BROTHERS = 'BROTHERS',
}
