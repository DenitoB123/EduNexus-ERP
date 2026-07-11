/** Mirrors `MessageDeliveryStatus` in prisma/schema.prisma. */
export enum DeliveryStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}
