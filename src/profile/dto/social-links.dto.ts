import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';

export class SocialLinksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'linkedin must be a valid URL' })
  linkedin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'github must be a valid URL' })
  github?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: false }, { message: 'telegram must be a valid URL or handle' })
  telegram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'twitter must be a valid URL' })
  twitter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'dribbble must be a valid URL' })
  dribbble?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'behance must be a valid URL' })
  behance?: string;
}
