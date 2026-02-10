import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStaffEmailDto {
  @ApiProperty({ example: 'tanaka@gmail.com' })
  @IsEmail()
  email: string;
}
