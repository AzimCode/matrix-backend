import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadResumeDto {
  @ApiPropertyOptional({ description: 'Version label; defaults to an ISO timestamp' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string;
}
