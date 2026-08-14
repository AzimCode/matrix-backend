import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { sanitizePlainText } from '../../common/utils/sanitize.util';

export class CreateContactMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => sanitizePlainText(value))
  name: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }) => sanitizePlainText(value))
  subject: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  @Transform(({ value }) => sanitizePlainText(value))
  message: string;

  @ApiPropertyOptional({
    description: 'Honeypot field — must stay empty. Real users never see or fill it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ description: 'Client-recorded epoch ms when the form was first rendered' })
  @IsOptional()
  formRenderedAt?: number;
}
