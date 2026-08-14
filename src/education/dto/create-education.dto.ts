import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { sanitizePlainText } from '../../common/utils/sanitize.util';

export class CreateEducationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  institution: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  degree: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  field?: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => sanitizePlainText(value))
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
