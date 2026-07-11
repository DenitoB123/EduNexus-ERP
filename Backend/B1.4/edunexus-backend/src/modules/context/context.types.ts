export interface RequestContext {
  userId: string | null;
  role: string | null;
  schoolId: string | null;
  correlationId?: string;
  ip?: string;
}
