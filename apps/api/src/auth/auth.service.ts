import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service.js';
import { RegisterDto, LoginDto } from './auth.dto.js';
import bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Enforce strong password complexity validation rules
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordRegex.test(dto.password)) {
      throw new BadRequestException(
        'Password must be at least 12 characters long, containing at least one uppercase letter, one lowercase letter, one numeric digit, and one special character.'
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email address already exists');
    }

    // Increased cost factor to 12 for strong defensive security compliance
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create organization and user in a single database transaction
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          fullName: dto.fullName,
          passwordHash,
        },
      });

      const member = await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'ORG_ADMIN', // Creator is organization administrator
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        organization: org,
      };
    });
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 1. Generate refresh token first
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        expiresIn: '7d',
      },
    );

    const activeOrganizationId = user.memberships[0]?.organizationId ?? null;

    // 2. Create session database record
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        organizationId: activeOrganizationId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress,
        userAgent,
      },
    });

    // 3. Generate access token with sessionId bound
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, fullName: user.fullName, sessionId: session.id },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      memberships: user.memberships.map((m) => ({
        id: m.id,
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role,
      })),
      tokens: { accessToken, refreshToken },
    };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const session = await this.prisma.session.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.revoked || session.expiresAt < new Date()) {
      // If session is compromise-suspect, delete it
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      throw new UnauthorizedException('Refresh token is invalid or has expired');
    }

    const user = session.user;
    
    // Refresh token rotation: delete old token session, create new
    await this.prisma.session.delete({ where: { id: session.id } });

    const newRefreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        expiresIn: '7d',
      },
    );

    const activeOrganizationId = session.organizationId ?? user.memberships[0]?.organizationId ?? null;

    const newSession = await this.prisma.session.create({
      data: {
        userId: user.id,
        organizationId: activeOrganizationId,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress,
        userAgent,
      },
    });

    const newAccessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, fullName: user.fullName, sessionId: newSession.id },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      memberships: user.memberships.map((m) => ({
        id: m.id,
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role,
      })),
      tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({
      where: { token: refreshToken },
    });
  }

  async getSessionInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session user is inactive or not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      memberships: user.memberships.map((m) => ({
        id: m.id,
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role,
      })),
    };
  }
}
