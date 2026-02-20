import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class ListBookingsQueryDto {
  @ApiPropertyOptional({ enum: ['renter', 'owner'], default: 'renter' })
  @IsOptional()
  @IsEnum(['renter', 'owner'])
  role?: 'renter' | 'owner' = 'renter';
}
