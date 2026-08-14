import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ContactMessageStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class MessageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ContactMessageStatus })
  @IsOptional()
  @IsIn(Object.values(ContactMessageStatus))
  status?: ContactMessageStatus;
}
