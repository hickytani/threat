import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { AuthenticatedRequest } from './auth.interface.js';
import { UserRole } from 'shared-types';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required before tenant access check');
    }

    const organizationId = this.extractOrganizationId(request);

    if (!organizationId) {
      throw new ForbiddenException('Organization context (ID) is required');
    }

    // Verify membership in database
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not belong to the requested organization');
    }

    if (!member.user || !member.user.isActive) {
      throw new ForbiddenException('Your user account is suspended or inactive');
    }

    // Attach active member context to request
    request.member = {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role as UserRole,
    };

    return true;
  }

  private extractOrganizationId(request: any): string | null {
    // 1. Check headers
    const headerOrgId = request.headers['x-organization-id'];
    if (headerOrgId && typeof headerOrgId === 'string') {
      return headerOrgId;
    }

    // 2. Check route params
    if (request.params) {
      if (request.params.organizationId) return request.params.organizationId;
      if (request.params.orgId) return request.params.orgId;
    }

    // 3. Check query params
    if (request.query) {
      if (request.query.organizationId) return request.query.organizationId;
      if (request.query.orgId) return request.query.orgId;
    }

    // 4. Check request body
    if (request.body) {
      if (request.body.organizationId) return request.body.organizationId;
      if (request.body.orgId) return request.body.orgId;
    }

    return null;
  }
}
