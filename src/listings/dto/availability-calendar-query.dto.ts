import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class AvailabilityCalendarQueryDto {
  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2026-05-08T00:00:00.000Z' })
  @IsDateString()
  endAt!: string;
}
