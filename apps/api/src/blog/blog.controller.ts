import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BlogService } from './blog.service';
import { CreatePostDto, TrackPostViewDto, UpdatePostDto } from './dto/blog.dto';

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
  @Get('admin/posts/:id/analytics')
  analytics(@Param('id') id: string, @Query('days') days?: string) {
    return this.blogService.getPostAnalytics(id, days ? Number(days) : 30);
  }
}
