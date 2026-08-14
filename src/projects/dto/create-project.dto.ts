import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProjectStatus } from '@prisma/client';
import { sanitizePlainText } from '../../common/utils/sanitize.util';

export class CreateProjectDto {
  @ApiPropertyOptional({ description: 'URL-safe identifier; auto-generated from title if omitted' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be lowercase, alphanumeric, hyphen-separated' })
  @MaxLength(160)
  slug?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(220)
  subtitle?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(8000)
  @Transform(({ value }) => sanitizePlainText(value))
  description: string;

  @ApiProperty()
  @IsInt()
  @Min(1990)
  @Max(2100)
  year: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  client?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @ApiPropertyOptional({ type: [String], description: 'Media IDs, in display order' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  galleryMediaIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  technologies?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  liveUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  caseStudyUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsIn(Object.values(ProjectStatus))
  status?: ProjectStatus;
}
