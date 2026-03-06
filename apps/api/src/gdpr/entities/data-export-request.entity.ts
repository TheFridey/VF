// Data export request - not a separate Prisma model
// Export requests are tracked in audit logs
export interface DataExportRequest {
  userId: string;
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
}
