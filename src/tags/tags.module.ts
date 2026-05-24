import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from '../common/guards/admin.guard';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';

@Module({
  imports: [PrismaModule],
  providers: [TagsService, AdminGuard],
  controllers: [TagsController],
  exports: [TagsService],
})
export class TagsModule {}
