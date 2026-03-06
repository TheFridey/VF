import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract user from request (set by auth guard)
    const user = (req as any).user;
    
    if (user?.id) {
      // Update last active timestamp (debounced - only every 60 seconds)
      const now = new Date();
      
      // Fire and forget - don't await
      this.prisma.user.update({
        where: { id: user.id },
        data: { 
          lastActiveAt: now,
          isOnline: true,
        },
      }).catch(() => {
        // Ignore errors - this is non-critical
      });
    }

    next();
  }
}
