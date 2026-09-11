import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service.js';
import type { AuthenticatedRequest } from './auth.interface.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Verify session exists and is active in the database
      if (!payload.sessionId) {
        throw new UnauthorizedException('Authentication token is invalid (missing session footprint)');
      }

      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: {
          user: true
        }
      });

      if (!session) {
        throw new UnauthorizedException('Active session could not be resolved from the database');
      }

      if (session.revoked) {
        throw new UnauthorizedException('This session has been revoked');
      }

      if (session.expiresAt < new Date()) {
        throw new UnauthorizedException('This session has expired');
      }

      if (!session.user || !session.user.isActive) {
        throw new UnauthorizedException('User account is suspended or inactive');
      }

      // Verify user's membership for the session's active organizationId
      let activeMember: any = null;
      if (session.organizationId) {
        activeMember = await this.prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: session.organizationId,
              userId: session.user.id,
            },
          },
        });
      }

      // Fallback: If no organizationId is active in the session, default to their first membership
      if (!activeMember) {
        const fallbackMember = await this.prisma.organizationMember.findFirst({
          where: { userId: session.user.id }
        });
        if (fallbackMember) {
          activeMember = fallbackMember;
          // Dynamically update active session with fallback organization context
          await this.prisma.session.update({
            where: { id: session.id },
            data: { organizationId: fallbackMember.organizationId }
          });
        }
      }

      if (!activeMember) {
        throw new UnauthorizedException('User is not associated with any active organization memberships');
      }

      // Attach resolved user context
      request.user = {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
      };

      // Attach tenant active member context
      request.member = {
        id: activeMember.id,
        organizationId: activeMember.organizationId,
        userId: activeMember.userId,
        role: activeMember.role,
      };

      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Authentication token is invalid or expired');
    }
  }

  private extractToken(request: any): string | null {
    if (request.cookies && request.cookies.access_token) {
      return request.cookies.access_token;
    }
    const authHeader = request.headers?.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    return null;
  }
}
