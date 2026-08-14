import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AvailabilityStatus, SystemStatusValue } from '@prisma/client';
import { SocialLinksDto } from './social-links.dto';
import { sanitizePlainText } from '../../common/utils/sanitize.util';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  headline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @Transform(({ value }) => sanitizePlainText(value))
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber(undefined)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ type: SocialLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  @ApiPropertyOptional({ enum: AvailabilityStatus })
  @IsOptional()
  @IsIn(Object.values(AvailabilityStatus))
  availability?: AvailabilityStatus;

  @ApiPropertyOptional({ enum: SystemStatusValue })
  @IsOptional()
  @IsIn(Object.values(SystemStatusValue))
  systemStatus?: SystemStatusValue;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  profileVersion?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  terminalMessages?: string[];
}
