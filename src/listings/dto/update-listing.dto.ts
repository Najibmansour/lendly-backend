import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNumber, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';

export class UpdateListingDto {
  @ApiPropertyOptional({ example: 'Road bike' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  title?: string;

  @ApiPropertyOptional({ example: 'Great condition road bike for weekend rides.' })
  @IsOptional()
  @IsString()
  @MinLength(20)
  description?: string;

  @ApiPropertyOptional({ example: 'bikes' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  category?: string;

  @ApiPropertyOptional({ example: 'Berlin' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  city?: string;

  @ApiPropertyOptional({ example: 52.520008 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 13.404954 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Mitte, Berlin, Germany' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  address?: string;

  @ApiPropertyOptional({ example: 'Like New' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  condition?: string;

  @ApiPropertyOptional({ example: ['Heavy Duty'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: ['https://example.com/image-1.jpg'] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  images?: string[];

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
