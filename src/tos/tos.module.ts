import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TosController } from './tos.controller';
import { TosService } from './tos.service';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [PrismaModule],
  controllers: [TosController],
  providers: [TosService, AdminGuard],
  exports: [TosService],
})
export class TosModule {}
