import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class IngestionCredentialService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, name: string, expiresAt?: Date) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new ConflictException('Credential name is required');
    }

    const token = `ts_ing_${randomBytes(32).toString('base64url')}`;
    const tokenHash = this.hashToken(token);
    const tokenPrefix = token.slice(0, 16);

    const credential = await this.prisma.ingestionCredential.create({
      data: {
        organizationId,
        name: normalizedName,
        tokenHash,
        tokenPrefix,
        expiresAt,
      },
    });

    return {
      id: credential.id,
      name: credential.name,
      tokenPrefix: credential.tokenPrefix,
      token,
      expiresAt: credential.expiresAt,
      createdAt: credential.createdAt,
    };
  }

  async list(organizationId: string) {
    return this.prisma.ingestionCredential.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(organizationId: string, id: string) {
    const credential = await this.prisma.ingestionCredential.findFirst({
      where: { id, organizationId },
    });
    if (!credential) {
      throw new NotFoundException('Ingestion credential not found');
    }

    return this.prisma.ingestionCredential.update({
      where: { id: credential.id },
      data: { revokedAt: new Date() },
      select: { id: true, revokedAt: true },
    });
  }

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
