import { IsString, IsOptional, IsArray, ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuScanCourseDto {
  @ApiProperty({ description: 'Course name (kanji)' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Dish details / description', nullable: true })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ description: 'Menu category', nullable: true })
  @IsString()
  @IsOptional()
  category?: string | null;
}

export class MenuScanConfirmDto {
  @ApiProperty({ type: [MenuScanCourseDto], description: 'Reviewed courses to save' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuScanCourseDto)
  courses: MenuScanCourseDto[];

  @ApiProperty({ description: 'Menu group ID to link the created menu items to' })
  @IsString()
  menu_group_id: string;

  @ApiPropertyOptional({ description: 'Seasonal menu ID', nullable: true })
  @ValidateIf((o) => o.seasonal_menu_id !== null)
  @IsString()
  @IsOptional()
  seasonal_menu_id?: string | null;

  @ApiPropertyOptional({ description: 'Draft scan session ID to mark as completed', nullable: true })
  @IsString()
  @IsOptional()
  draft_session_id?: string | null;
}

export class SaveDraftDto {
  @ApiProperty({ description: 'Menu group ID this draft belongs to' })
  @IsString()
  menu_group_id: string;

  @ApiPropertyOptional({ description: 'Menu title detected from scan' })
  @IsString()
  @IsOptional()
  menu_title?: string | null;

  @ApiProperty({ description: 'Current course list as JSON' })
  @IsArray()
  courses: any[];

  @ApiPropertyOptional({ description: 'Image URL of the scanned menu' })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({ description: 'Existing draft session ID to update' })
  @IsString()
  @IsOptional()
  session_id?: string | null;
}
