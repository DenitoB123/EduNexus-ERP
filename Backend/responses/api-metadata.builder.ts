export interface ApiMetadata {
  timestamp: string;
  correlationId?: string;
}

export class ApiMetadataBuilder {
  static build(correlationId?: string): ApiMetadata {
    return {
      timestamp: new Date().toISOString(),
      correlationId,
    };
  }
}
