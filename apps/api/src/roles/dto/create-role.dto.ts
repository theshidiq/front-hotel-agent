import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Chef' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ required: false, example: 'Menu management, view products' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ required: false, example: ['products.view', 'menus.create'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
