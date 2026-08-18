import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import { IsStrongPassword, PASSWORD_DESCRIPTION } from './password.rules';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'editor@matrix.dev' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: PASSWORD_DESCRIPTION, example: 'CorrectHorse42Battery' })
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({ enum: AdminRole, default: AdminRole.EDITOR })
  @IsOptional()
  @IsIn(Object.values(AdminRole))
  role?: AdminRole;
}
