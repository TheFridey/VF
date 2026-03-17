import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService, AuthenticatedUser } from './auth.service';
import { RedisService } from '../common/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { Param } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Get CSRF token (reads from cookie set by GET)' })
  getCsrfToken(@Req() req: Request) {
    // The CsrfMiddleware sets the csrf-token cookie on GET requests.
    // This endpoint exists so clients can hit it explicitly and get the token
    // reflected back in the response body as well as the cookie.
    const token = (req.cookies as Record<string, string>)?.['csrf-token'] ?? '';
    return { csrfToken: token };
  }

  // ── CRITICAL FIX: was missing @Public() and @Post('register') ──────────────
  // Without @Public() this endpoint was blocked by the global JwtAuthGuard.
  // Without @Post('register') it was not mapped to any HTTP route at all.
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login user' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(dto);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // access_token as HttpOnly cookie — JS cannot read it, eliminating
    // the XSS token-theft attack surface entirely.
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    // Non-HttpOnly session indicator — readable by Next.js Edge middleware.
    // Contains NO credential material — just a presence flag.
    res.cookie('session', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.sanitizeUser(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Blacklist the current access token so it can't be reused within its
    // remaining lifetime even if an attacker has a copy of it.
    const authHeader = req.headers['authorization'];
    const cookieToken = req.cookies?.access_token as string | undefined;
    const presentedToken =
      authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : cookieToken;

    if (presentedToken) {
      try {
        const decoded = this.jwtService.decode(presentedToken) as { sub: string; iat: number; exp: number } | null;
        if (decoded?.iat && decoded?.exp) {
          const remainingTtl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
          if (remainingTtl > 0) {
            await this.redisService.set(
              `blacklist:${decoded.sub}:${decoded.iat}`,
              '1',
              remainingTtl,
            );
          }
        }
      } catch {
        // Malformed token — ignore, still clear cookies
      }
    }

    await this.authService.logout(userId);
    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
    res.clearCookie('refresh_token', { ...cookieOptions, httpOnly: true });
    res.clearCookie('access_token', { ...cookieOptions, httpOnly: true });
    res.clearCookie('session', { ...cookieOptions, httpOnly: false });
    return { success: true };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken = body?.refreshToken || req.cookies?.refresh_token;
    if (!oldRefreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { accessToken, refreshToken } = await this.authService.refreshAccessToken(oldRefreshToken);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('session', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return { success: true };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email' })
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @ApiOperation({ summary: 'Reset password using token' })
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }
}
