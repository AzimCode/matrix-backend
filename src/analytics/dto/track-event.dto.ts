import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const PUBLIC_TRACKABLE_EVENTS = ['PAGE_VIEW'] as const;

export class TrackEventDto {
  @ApiProperty({ enum: PUBLIC_TRACKABLE_EVENTS })
  @IsIn(PUBLIC_TRACKABLE_EVENTS)
  event: (typeof PUBLIC_TRACKABLE_EVENTS)[number];

  @ApiPropertyOptional({ description: 'Client-side route/path being viewed' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;
}
