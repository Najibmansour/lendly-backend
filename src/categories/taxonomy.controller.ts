import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from '../categories/categories.service';
import { TagsService } from '../tags/tags.service';

@ApiTags('taxonomy')
@Controller('v1')
export class TaxonomyController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly tagsService: TagsService,
  ) {}

  @Get('taxonomy')
  @ApiOperation({
    summary:
      'Get combined categories and tags for mobile app (public, cached)',
  })
  async getTaxonomy() {
    const [categories, tags] = await Promise.all([
      this.categoriesService.getPublicCategories(),
      this.tagsService.getPublicTags(),
    ]);

    return {
      categories,
      tags,
    };
  }
}
