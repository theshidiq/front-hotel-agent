import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty({ example: 'Tanaka Taro' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'tanaka@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'スタッフ' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Department UUID' })
  @IsOptional()
  @IsString()
  department_id?: string;

  @ApiPropertyOptional({ description: 'Position UUID' })
  @IsOptional()
  @IsString()
  position_id?: string;
}
