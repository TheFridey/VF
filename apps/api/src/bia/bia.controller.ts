import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
  HttpCode, HttpStatus, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { BiaService } from './bia.service';
import {
  CreateThreadDto, CreatePostDto, CreateBusinessListingDto,
  CreateMentorProfileDto, SendMentorRequestDto, RespondMentorRequestDto,
} from './dto/bia.dto';

@ApiTags('BIA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bia')
export class BiaController {
  constructor(private readonly biaService: BiaService) {}

  // ─── Forums ───────────────────────────────────────────────────────────────

  @Get('forums')
  @ApiOperation({ summary: 'Get forum categories (BIA members only)' })
  getCategories(@CurrentUser('id') userId: string) {
    return this.biaService.getCategories(userId);
  }

  @Get('forums/:slug/threads')
  @ApiOperation({ summary: 'Get threads in a category' })
  @ApiQuery({ name: 'page', required: false })
  getThreads(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.biaService.getThreads(userId, slug, page);
  }

  @Post('forums/:slug/threads')
  @ApiOperation({ summary: 'Create a new thread' })
  createThread(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: CreateThreadDto,
  ) {
    return this.biaService.createThread(userId, slug, dto);
  }

  @Get('threads/:threadId')
  @ApiOperation({ summary: 'Get thread with posts' })
  @ApiQuery({ name: 'page', required: false })
  getThread(
    @CurrentUser('id') userId: string,
    @Param('threadId') threadId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.biaService.getThread(userId, threadId, page);
  }

  @Post('threads/:threadId/posts')
  @ApiOperation({ summary: 'Reply to a thread' })
  createPost(
    @CurrentUser('id') userId: string,
    @Param('threadId') threadId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.biaService.createPost(userId, threadId, dto);
  }

  // ─── Business Directory ───────────────────────────────────────────────────

  @Get('directory')
  @Public()
  @ApiOperation({ summary: 'Get business directory (public)' })
  @ApiQuery({ name: 'category', required: false })
  getDirectory(@Query('category') category?: string) {
    return this.biaService.getBusinessListings(category);
  }

  @Get('directory/mine')
  @ApiOperation({ summary: 'Get my business listing' })
  getMyListing(@CurrentUser('id') userId: string) {
    return this.biaService.getMyListing(userId);
  }

  @Post('directory')
  @ApiOperation({ summary: 'Create or update business listing (BIA+)' })
  createListing(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBusinessListingDto,
  ) {
    return this.biaService.createBusinessListing(userId, dto);
  }

  // ─── Mentorship ───────────────────────────────────────────────────────────

  @Get('mentorship')
  @ApiOperation({ summary: 'Get available mentors (BIA+)' })
  getMentors(@CurrentUser('id') userId: string) {
    return this.biaService.getMentors();
  }

  @Post('mentorship/profile')
  @ApiOperation({ summary: 'Create or update mentor profile (BIA+)' })
  upsertMentorProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMentorProfileDto,
  ) {
    return this.biaService.createOrUpdateMentorProfile(userId, dto);
  }

  @Get('mentorship/requests')
  @ApiOperation({ summary: 'Get my mentor requests (incoming + outgoing)' })
  getMentorRequests(@CurrentUser('id') userId: string) {
    return this.biaService.getMyMentorRequests(userId);
  }

  @Post('mentorship/request')
  @ApiOperation({ summary: 'Send a mentor request (BIA+)' })
  sendRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMentorRequestDto,
  ) {
    return this.biaService.sendMentorRequest(userId, dto);
  }

  @Post('mentorship/request/:requestId/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or decline a mentor request' })
  respondToRequest(
    @CurrentUser('id') userId: string,
    @Param('requestId') requestId: string,
    @Body() dto: RespondMentorRequestDto,
  ) {
    return this.biaService.respondToMentorRequest(userId, requestId, dto.accept);
  }

  // ─── Career Resources ─────────────────────────────────────────────────────

  @Get('careers')
  @ApiOperation({ summary: 'Get career resources (BIA+)' })
  getCareerResources(
    @CurrentUser('id') userId: string,
    @Query('category') category?: string,
  ) {
    return this.biaService.getCareerResources(category);
  }

  // ─── Regiment Forums ──────────────────────────────────────────────────────

  @Get('regiments')
  @Public()
  @ApiOperation({ summary: 'Get all UK regiments with member user counts (public)' })
  getRegiments() {
    return this.biaService.getRegiments();
  }

  @Get('regiments/:slug/forums')
  @ApiOperation({ summary: 'Get forum categories for a regiment (regiment members only)' })
  getRegimentForumCategories(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
  ) {
    return this.biaService.getRegimentForumCategories(userId, slug);
  }
}
