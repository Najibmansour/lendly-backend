import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAvailabilityBlockDto {
  @ApiProperty({ example: '2025-03-01T00:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2025-03-02T00:00:00.000Z' })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ example: 'Maintenance' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
