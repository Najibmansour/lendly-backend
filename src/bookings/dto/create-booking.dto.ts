import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UNIT_PREFERENCE_VALUES } from '../../quotes/dto/create-quote.dto';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  listingId!: string;

  @ApiProperty({ example: '2025-03-01T10:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2025-03-03T10:00:00.000Z' })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ enum: ['AUTO', 'HOUR', 'DAY', 'WEEK', 'MONTH'] })
  @IsOptional()
  @IsEnum(UNIT_PREFERENCE_VALUES)
  unitPreference?: (typeof UNIT_PREFERENCE_VALUES)[number];
}
