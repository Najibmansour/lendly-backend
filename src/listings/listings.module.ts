import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { AvailabilityService } from './availability.service';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, AvailabilityService],
  exports: [ListingsService, AvailabilityService],
})
export class ListingsModule {}
