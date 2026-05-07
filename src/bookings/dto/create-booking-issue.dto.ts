import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookingIssueDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  category?: string;
}
