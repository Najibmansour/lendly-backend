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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';

@ApiTags('categories')
@Controller('v1')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // Public routes
  @Get('categories')
  @ApiOperation({ summary: 'List all active categories' })
  async getPublicCategories() {
    return this.categoriesService.getPublicCategories();
  }

  @Get('categories/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  // Admin routes
  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a category (admin only)' })
  async createCategory(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(dto, user.id);
  }

  @Get('admin/categories')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all categories with filters (admin only)',
  })
  async listCategories(@Query() query: ListCategoriesQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get('admin/categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get category by ID (admin only)' })
  async getCategoryById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Patch('admin/categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (admin only)' })
  async updateCategory(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto, user.id);
  }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete/disable category (admin only)' })
  async deleteCategory(@Param('id') id: string) {
    await this.categoriesService.delete(id);
    return { message: 'Category deleted successfully' };
  }
}
