import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  IsUUID,
} from 'class-validator';

export class CreateListingDto {
  @ApiProperty({ example: 'Road bike' })
  @IsString()
  @MinLength(5)
  title!: string;

  @ApiProperty({ example: 'Great condition road bike for weekend rides.' })
  @IsString()
  @MinLength(20)
  description!: string;

  @ApiProperty({ example: 'uuid-of-category-id', description: 'Category UUID' })
  @IsString()
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({ example: 'Berlin' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  city?: string;

  @ApiProperty({ example: 52.520008 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 13.404954 })
  @IsNumber()
  longitude!: number;

  @ApiProperty({ example: 'Mitte, Berlin, Germany' })
  @IsString()
  @MinLength(5)
  address!: string;

  @ApiPropertyOptional({ example: 'Like New' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  condition?: string;

  @ApiPropertyOptional({
    example: ['uuid-tag-1', 'uuid-tag-2'],
    description: 'Array of tag UUIDs (max 5)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUUID('all', { each: true })
  tagIds?: string[];

  @ApiProperty({
    example: [
      'https://example.com/image-1.jpg',
      'https://example.com/image-2.jpg',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  images!: string[];

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  dailyRate?: number;

  @ApiPropertyOptional({ example: 280 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  weeklyRate?: number;
}
