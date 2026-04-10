import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';

export class CreateListingDto {
  @ApiProperty({ example: 'Road bike' })
  @IsString()
  @MinLength(5)
  title!: string;

  @ApiProperty({ example: 'Great condition road bike for weekend rides.' })
  @IsString()
  @MinLength(20)
  description!: string;

  @ApiProperty({ example: 'bikes' })
  @IsString()
  @MinLength(2)
  category!: string;

  @ApiProperty({ example: 'Berlin' })
  @IsString()
  @MinLength(2)
  city!: string;

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
