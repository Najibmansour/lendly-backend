import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const LOCALE_PATTERN = /^[a-z]{2}$/i;

export class CreateTosDto {
  @ApiProperty({
    example: 'en',
    description: 'Locale code for the TOS document',
  })
  @IsOptional()
  @IsString()
  @Matches(LOCALE_PATTERN, {
    message: 'Locale must be a two-letter language code',
  })
  locale?: string = 'en';

  @ApiProperty({
    example: '# Terms of Service\nThis is the legal text...',
    description: 'Markdown content of the Terms of Service',
  })
  @IsString()
  @Length(10, 100000)
  content!: string;

  @ApiProperty({
    example: false,
    required: false,
    description:
      'Whether this version requires users to re-accept in the future',
  })
  @IsOptional()
  @IsBoolean()
  requiresReacceptance?: boolean;
}
