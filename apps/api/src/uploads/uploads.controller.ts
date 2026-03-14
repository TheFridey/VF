import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PhotosService } from './photos.service';
import { PHOTO_UPLOAD_FILE_TYPE, PHOTO_UPLOAD_MAX_BYTES } from './upload-validation';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private photosService: PhotosService) {}

  @Get('photos')
  @ApiOperation({ summary: 'Get all photos for current user' })
  async getMyPhotos(@CurrentUser() user: User) {
    return this.photosService.getPhotos(user.id);
  }

  @Post('photos')
  @ApiOperation({ summary: 'Upload a new photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: PHOTO_UPLOAD_MAX_BYTES }),
          new FileTypeValidator({ fileType: PHOTO_UPLOAD_FILE_TYPE }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.photosService.uploadPhoto(user.id, file);
  }

  @Delete('photos/:photoId')
  @ApiOperation({ summary: 'Delete a photo' })
  async deletePhoto(
    @CurrentUser() user: User,
    @Param('photoId') photoId: string,
  ) {
    return this.photosService.deletePhoto(user.id, photoId);
  }

  @Patch('photos/:photoId/primary')
  @ApiOperation({ summary: 'Set a photo as primary' })
  async setPrimaryPhoto(
    @CurrentUser() user: User,
    @Param('photoId') photoId: string,
  ) {
    return this.photosService.setPrimaryPhoto(user.id, photoId);
  }

  @Patch('photos/reorder')
  @ApiOperation({ summary: 'Reorder photos' })
  async reorderPhotos(
    @CurrentUser() user: User,
    @Body() body: { photoIds: string[] },
  ) {
    return this.photosService.reorderPhotos(user.id, body.photoIds);
  }
}
