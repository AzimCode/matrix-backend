import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateSkillDto {
  @ApiProperty()
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  category: string;

  @ApiProperty({ minimum: 1, maximum: 5, default: 1 })
  @IsInt()
  @Min(1)
  @Max(5)
  level: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  years?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
