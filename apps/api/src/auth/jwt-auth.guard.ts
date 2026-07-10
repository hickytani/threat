import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from './auth.interface.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'threatsync_super_secret_access_token_key_12345',
      });
      request.user = {
        id: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
      };
      return true;
    } catch (err) {
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
