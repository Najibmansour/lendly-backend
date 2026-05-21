import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(2)
  lastName!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+15551234567' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message:
      'Phone number must include the country code and be in E.164 format',
  })
  phone!: string;


  @ApiProperty({ example: 'securePassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true, { message: 'Terms must be accepted' })
  acceptTerms!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true, { message: 'Privacy policy must be accepted' })
  acceptPrivacy!: boolean;

  @ApiProperty({ example: 'en', required: false })
  @IsOptional()
  @IsString()
  tosLocale?: string;
}
