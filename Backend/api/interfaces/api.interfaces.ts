export interface IApiRequestContext {
  tenantId: string;
  correlationId?: string;
  actorId?: string;
  apiVersion: string;
  requestedAt: Date;
}

export interface IBulkOperationResult<T> {
  succeeded: T[];
  failed: Array<{ index: number; error: string }>;
  total: number;
  successCount: number;
  failureCount: number;
}

export interface IFileResponse {
  buffer: Buffer;
  filename: string;
  contentType: string;
}
