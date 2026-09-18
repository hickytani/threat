import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.interface.js';
import { PrismaService } from '../common/prisma.service.js';
import { IngestionCredentialService } from './ingestion-credential.service.js';

@Injectable()
export class IngestionAuthGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private credentials: IngestionCredentialService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    const xTokenHeader = request.headers['x-ingestion-token'] as string | undefined;
    const xKeyHeader = request.headers['x-ingestion-key'] as string | undefined;
    const xApiKeyHeader = request.headers['x-api-key'] as string | undefined;

    let token = '';
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (authHeader && authHeader.startsWith('ts_ing_')) {
      token = authHeader.trim();
    } else if (xTokenHeader) {
      token = xTokenHeader.trim();
    } else if (xKeyHeader) {
      token = xKeyHeader.trim();
    } else if (xApiKeyHeader) {
      token = xApiKeyHeader.trim();
    }

    if (!token || !token.startsWith('ts_ing_')) {
      throw new UnauthorizedException('A valid ingestion credential is required (e.g. Bearer ts_ing_... or X-Ingestion-Token header)');
    }

    const credential = await this.prisma.ingestionCredential.findUnique({
      where: { tokenHash: this.credentials.hashToken(token) },
    });

    if (!credential || credential.revokedAt || (credential.expiresAt && credential.expiresAt <= new Date())) {
      throw new UnauthorizedException('Ingestion credential is invalid, revoked, or expired');
    }

    await this.prisma.ingestionCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });

    request.user = {
      id: `ingestion:${credential.id}`,
      email: `${credential.tokenPrefix}@ingestion.local`,
      fullName: 'Telemetry Ingestion',
    };
    request.member = {
      id: `ingestion:${credential.id}`,
      organizationId: credential.organizationId,
      userId: `ingestion:${credential.id}`,
      role: 'SECURITY_ANALYST',
    };

    return true;
  }
}
