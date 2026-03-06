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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    
    const { user, accessToken, refreshToken } = await this.authService.login(
      dto,
      ipAddress,
      userAgent,
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user, accessToken, refreshToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@CurrentUser() user: any) {
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
    await this.authService.logout(userId);
    res.clearCookie('refresh_token');
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
    // Accept refresh token from body or cookie
    const oldRefreshToken = body?.refreshToken || req.cookies?.refresh_token;
    if (!oldRefreshToken) {
      throw new Error('No refresh token');
    }

    const ipAddress = req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    
    const { accessToken, refreshToken } = await this.authService.refreshAccessToken(
      oldRefreshToken,
      ipAddress,
      userAgent,
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, refreshToken };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email' })
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}
