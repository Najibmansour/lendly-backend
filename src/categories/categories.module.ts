import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TaxonomyController } from './taxonomy.controller';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [PrismaModule, TagsModule],
  providers: [CategoriesService, AdminGuard],
  controllers: [CategoriesController, TaxonomyController],
  exports: [CategoriesService],
})
export class CategoriesModule {}
