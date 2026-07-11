import { Injectable, Scope } from '@nestjs/common';
import { RequestContext } from './context.types';

@Injectable({ scope: Scope.REQUEST })
export class ContextService {
  private ctx: RequestContext = {
    userId: null,
    role: null,
    schoolId: null,
  };

  set(context: Partial<RequestContext>): void {
    this.ctx = { ...this.ctx, ...context };
  }

  get(): RequestContext {
    return this.ctx;
  }

  getUserId(): string | null {
    return this.ctx.userId;
  }

  getRole(): string | null {
    return this.ctx.role;
  }

  getSchoolId(): string | null {
    return this.ctx.schoolId;
  }

  getCorrelationId(): string | undefined {
    return this.ctx.correlationId;
  }

  isAuthenticated(): boolean {
    return this.ctx.userId !== null;
  }

  hasTenant(): boolean {
    return this.ctx.schoolId !== null;
  }

  isSuperAdmin(): boolean {
    return this.ctx.role === 'SUPER_ADMIN';
  }
}
