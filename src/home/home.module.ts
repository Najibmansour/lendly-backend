import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [PrismaModule, ListingsModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
