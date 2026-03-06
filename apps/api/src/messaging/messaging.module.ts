import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule, 
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, ChatGateway],
  exports: [MessagingService, ChatGateway],
})
export class MessagingModule {}
