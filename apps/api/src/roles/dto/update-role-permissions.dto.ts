import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ required: false, example: 'Chef' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty({ required: false, example: 'Menu management, view products' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ example: ['products.view', 'menus.create', 'menus.edit'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
