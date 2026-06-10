import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ListTagsQueryDto } from './dto/list-tags-query.dto';

@ApiTags('tags')
@Controller('v1')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  // Public routes
  @Get('tags')
  @ApiOperation({ summary: 'List all active tags' })
  async getPublicTags() {
    return this.tagsService.getPublicTags();
  }

  // Admin routes
  @Post('admin/tags')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tag (admin only)' })
  async createTag(@CurrentUser() user: JwtUser, @Body() dto: CreateTagDto) {
    return this.tagsService.create(dto, user.id);
  }

  @Get('admin/tags')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all tags with filters (admin only)',
  })
  async listTags(@Query() query: ListTagsQueryDto) {
    return this.tagsService.findAll(query);
  }

  @Get('admin/tags/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tag by ID (admin only)' })
  async getTagById(@Param('id') id: string) {
    return this.tagsService.findById(id);
  }

  @Patch('admin/tags/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tag (admin only)' })
  async updateTag(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.update(id, dto, user.id);
  }

  @Delete('admin/tags/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete/disable tag (admin only)' })
  async deleteTag(@Param('id') id: string) {
    await this.tagsService.delete(id);
    return { message: 'Tag deleted successfully' };
  }
}
