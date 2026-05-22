import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class HomeQueryDto {
  @ApiPropertyOptional({ description: 'City to filter homepage content', example: 'Paris' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  city?: string;

  @ApiPropertyOptional({ description: 'Max items per section', example: 10, default: 10, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limitPerSection?: number = 10;
}
