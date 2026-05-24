import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    description: 'Include inactive categories',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  includeInactive?: boolean = false;

  @ApiPropertyOptional({
    description: 'Search by name or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class ListCategoriesResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  listingCount?: number;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  updatedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
