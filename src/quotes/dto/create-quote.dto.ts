import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export const UNIT_PREFERENCE_VALUES = ['AUTO', 'HOUR', 'DAY', 'WEEK', 'MONTH'] as const;
export type UnitPreferenceDto = (typeof UNIT_PREFERENCE_VALUES)[number];

export class CreateQuoteDto {
  @ApiProperty()
  @IsUUID()
  listingId!: string;

  @ApiProperty({ example: '2025-03-01T10:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2025-03-03T10:00:00.000Z' })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ enum: UNIT_PREFERENCE_VALUES, default: 'AUTO' })
  @IsOptional()
  @IsEnum(UNIT_PREFERENCE_VALUES)
  unitPreference?: UnitPreferenceDto;
}
