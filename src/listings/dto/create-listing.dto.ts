import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';

export class CreateListingDto {
  @ApiProperty({ example: 'Road bike' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Great condition road bike for weekend rides.' })
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ example: 'bikes' })
  @IsString()
  @MaxLength(100)
  category!: string;

  @ApiProperty({ example: 'good' })
  @IsString()
  @MaxLength(100)
  condition!: string;

  @ApiProperty({ example: 'Berlin' })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyRate?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weeklyRate?: number;

  @ApiPropertyOptional({ example: 600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRate?: number;

  @ApiProperty({ description: 'Array of image URLs (max 10)', type: [String], example: ['https://example.com/1.jpg'] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  @IsString({ each: true })
  @Type(() => String)
  images!: string[];

}
