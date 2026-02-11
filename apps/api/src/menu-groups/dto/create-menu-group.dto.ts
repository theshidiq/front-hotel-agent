import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuGroupDto {
  @ApiProperty({ description: 'Menu group name', example: 'Kids' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Seasonal menu ID this group belongs to' })
  @IsString()
  @IsOptional()
  seasonal_menu_id?: string;

  @ApiPropertyOptional({ description: 'Array of category IDs for allowed courses', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  course_ids?: string[];
}
