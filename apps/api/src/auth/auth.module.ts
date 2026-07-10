import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { PrismaService } from '../common/prisma.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { TenantGuard } from './tenant.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'threatsync_super_secret_access_token_key_12345',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtAuthGuard, TenantGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, TenantGuard, RolesGuard],
})
export class AuthModule {}
