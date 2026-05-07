import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const PAYMENT_STATUS_VALUES = ['UNPAID', 'HOLD', 'PAID', 'FAILED'] as const;

export class UpdateBookingPaymentDto {
  @ApiPropertyOptional({ enum: PAYMENT_STATUS_VALUES })
  @IsOptional()
  @IsEnum(PAYMENT_STATUS_VALUES)
  paymentStatus?: (typeof PAYMENT_STATUS_VALUES)[number];

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentReference?: string;
}
