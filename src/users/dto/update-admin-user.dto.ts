import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { IsIn } from 'class-validator';

export class UpdateAdminUserDto {
  @ApiProperty({ enum: AdminRole })
  @IsIn(Object.values(AdminRole))
  role: AdminRole;
}
