import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsController } from './uploads.controller';
import { PhotosService } from './photos.service';
import { CloudinaryService } from './cloudinary.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: memoryStorage(), // Store in memory for Cloudinary upload
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1,
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [PhotosService, CloudinaryService],
  exports: [PhotosService, CloudinaryService],
})
export class UploadsModule {}
