import { IsString, IsOptional, IsArray, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuGroupDto {
  @ApiProperty({ description: 'Menu group name', example: 'Kids' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Guest-facing display title for the menu' })
  @IsString()
  @IsOptional()
  display_title?: string;

  @ApiPropertyOptional({ description: 'Seasonal menu ID this group belongs to' })
  @IsString()
  @IsOptional()
  seasonal_menu_id?: string;

  @ApiPropertyOptional({ description: 'Array of category IDs for allowed courses', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  course_ids?: string[];

  @ApiPropertyOptional({ description: 'Array of linked kids menu group IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  kids_group_ids?: string[];

  @ApiPropertyOptional({ description: 'Array of night counts this menu group applies to. Example: [1] for 新規 (one night), [2,3,4] for 滞在 (2-4 nights). NULL/undefined means no restriction.', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  stay_period_nights?: number[];
}
