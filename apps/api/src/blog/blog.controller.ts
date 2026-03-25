import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  ParseFilePipe,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreatePostDto, TrackPostViewDto, UpdatePostDto } from './dto/blog.dto';
import { PHOTO_UPLOAD_FILE_TYPE, PHOTO_UPLOAD_MAX_BYTES } from '../uploads/upload-validation';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Public()
  @Get('posts')
  listPublished(
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.listPublishedPosts(
      tag,
      page ? Number(page) : 1,
      limit ? Number(limit) : 12,
    );
  }

  @Public()
  @Get('posts/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.blogService.getPostBySlug(slug);
  }

  @Public()
  @Post('views')
  trackView(@Body() dto: TrackPostViewDto) {
    return this.blogService.trackView(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @Post('uploads/cover-image')
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
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadCoverImage(
    @CurrentUser() user: { id: string },
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
    return this.blogService.uploadCoverImage(file, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @Post('posts')
  create(@Body() dto: CreatePostDto, @CurrentUser() user: { id: string }) {
    return this.blogService.createPost(dto, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @Put('posts/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.blogService.updatePost(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @Delete('posts/:id')
  delete(@Param('id') id: string) {
    return this.blogService.deletePost(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @Get('admin/posts')
  listAll(
    @Query('status') status?: PostStatus,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.listPosts({
      status,
      tag,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @Get('admin/posts/:id')
  getOne(@Param('id') id: string) {
    return this.blogService.getPost(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @Get('admin/posts/:id/share-preview')
  sharePreview(@Param('id') id: string) {
    return this.blogService.getSocialSharePreview(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @ApiBearerAuth()
  @Get('admin/posts/:id/analytics')
  analytics(@Param('id') id: string, @Query('days') days?: string) {
    return this.blogService.getPostAnalytics(id, days ? Number(days) : 30);
  }
}
