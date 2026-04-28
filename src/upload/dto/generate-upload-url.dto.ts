import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export class GenerateUploadUrlDto {
  @ApiProperty({ example: 'image', enum: FileType, description: 'Type of file being uploaded' })
  @IsEnum(FileType)
  fileType: FileType;

  @ApiPropertyOptional({ example: 'jpg', description: 'File extension (without dot)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  extension?: string;

  @ApiPropertyOptional({ example: 'listing-photos', description: 'Optional subfolder path' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  folder?: string;
}