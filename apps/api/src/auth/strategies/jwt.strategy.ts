import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../common/redis/redis.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    super({
      // Extract token from Authorization header AND make the raw token
      // available via req so we can check the blacklist
      // Extract JWT from Authorization header OR httpOnly cookie.
      // Cookie path covers browser clients; header path covers API clients/mobile.
      jwtFromRequest: (req: Request) => {
        const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        if (fromHeader) return fromHeader;
        // Fallback to httpOnly cookie (browser requests)
        const cookies = (req as unknown as Record<string, Record<string, string>>).cookies;
        return cookies?.access_token ?? null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string; email: string; role: string; iat: number; exp: number }) {
    // ── JWT blacklist check ────────────────────────────────────────────────
    // On logout we write `blacklist:<jti>` to Redis with TTL = remaining token
    // lifetime. Any request carrying a blacklisted token is rejected immediately
    // even within the 15-minute access token window.
    // We use payload.iat (issued-at) as a per-user revocation key so that a
    // logout invalidates ALL tokens issued before that moment for that user,
    // not just the one presented (covers token leakage / device theft).
    const blacklistKey = `blacklist:${payload.sub}:${payload.iat}`;
    const isBlacklisted = await this.redisService.exists(blacklistKey);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
