import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty({ example: 'Tanaka Taro' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'tanaka@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'スタッフ' })
  @IsNotEmpty()
  @IsString()
  position: string;
}
