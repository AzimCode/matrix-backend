import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateCertificateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  issuer: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  credentialUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  credentialId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
