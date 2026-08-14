import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ContactMessageStatus } from '@prisma/client';

export class UpdateMessageStatusDto {
  @ApiProperty({ enum: ContactMessageStatus })
  @IsIn(Object.values(ContactMessageStatus))
  status: ContactMessageStatus;
}
