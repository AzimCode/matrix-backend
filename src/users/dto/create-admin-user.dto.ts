import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'editor@matrix.dev' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description:
      'At least 12 characters, with a lowercase letter, an uppercase letter, and a digit.',
    example: 'CorrectHorse42Battery',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain a digit' })
  password: string;

  @ApiPropertyOptional({ enum: AdminRole, default: AdminRole.EDITOR })
  @IsOptional()
  @IsIn(Object.values(AdminRole))
  role?: AdminRole;
}
