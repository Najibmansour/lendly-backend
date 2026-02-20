import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const LISTING_SORT_VALUES = ['newest', 'price'] as const;
export type ListingSort = (typeof LISTING_SORT_VALUES)[number];

export class ListListingsQueryDto {
  @ApiPropertyOptional({ description: 'Search in title/description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'bikes' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Berlin' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: LISTING_SORT_VALUES, default: 'newest' })
  @IsOptional()
  @IsEnum(LISTING_SORT_VALUES)
  sort?: ListingSort = 'newest';
}
