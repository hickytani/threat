import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from './auth.interface.js';

@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    
    if (!request.user || !request.member) {
      throw new UnauthorizedException('Authentication required before tenant access check');
    }

    // Every query relies on request.member.organizationId resolved by JwtAuthGuard
    if (!request.member.organizationId) {
      throw new ForbiddenException('You do not have an active organization context.');
    }

    return true;
  }
}
