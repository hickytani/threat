import { Controller, Post, Body, Req, Res, Get, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto, LoginDto } from './auth.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    const result = await this.authService.login(dto, ip, userAgent);

    // Set secure HttpOnly cookies
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    return {
      user: result.user,
      memberships: result.memberships,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      res.status(HttpStatus.UNAUTHORIZED);
      return { error: 'Refresh token is missing' };
    }

    const ip = req.ip || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    try {
      const result = await this.authService.refresh(refreshToken, ip, userAgent);
      this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      return {
        user: result.user,
        memberships: result.memberships,
      };
    } catch (err) {
      // Clear cookies if refresh failed (compromise or expiration)
      this.clearAuthCookies(res);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  async getSession(@CurrentUser() user: any) {
    return this.authService.getSessionInfo(user.id);
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      expires: new Date(0),
    });

    res.cookie('refresh_token', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      expires: new Date(0),
    });
  }
}
