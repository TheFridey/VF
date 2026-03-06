import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Basic health check' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check (database + redis)' })
  async ready() {
    const checks: Record<string, boolean> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      await this.redis.client.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
    }

    const allHealthy = Object.values(checks).every(Boolean);

    return {
      status: allHealthy ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness check' })
  async live() {
    return {
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
