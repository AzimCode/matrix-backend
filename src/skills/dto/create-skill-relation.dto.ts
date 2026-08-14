import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSkillRelationDto {
  @ApiProperty()
  @IsString()
  relatedSkillId: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  strength?: number;
}
