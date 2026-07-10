import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from './prisma.service.js';
import { AuthenticatedRequest } from '../auth/auth.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class TenantScopedRepository {
  constructor(
    @Inject(REQUEST) protected readonly request: AuthenticatedRequest,
    protected readonly prisma: PrismaService,
  ) {}

  /**
   * Resolves the verified organizationId from the active token session.
   * Throws an error if accessed outside an authenticated tenant-scoped route.
   */
  get organizationId(): string {
    const orgId = this.request?.member?.organizationId;
    if (!orgId) {
      throw new Error('System error: Attempted to query tenant records without an active organization context.');
    }
    return orgId;
  }

  /**
   * Automatically appends organizationId to any find/query criteria
   */
  protected scopedCriteria<T extends Record<string, any>>(where: T): T & { organizationId: string } {
    return {
      ...where,
      organizationId: this.organizationId,
    };
  }

  /**
   * Automatically appends organizationId to any mutation data payload
   */
  protected scopedData<T extends Record<string, any>>(data: T): T & { organization: { connect: { id: string } } } {
    return {
      ...data,
      organization: {
        connect: { id: this.organizationId }
      }
    };
  }
}
export default TenantScopedRepository;
