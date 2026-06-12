import { IsString, IsOptional, IsArray, ValidateNested, ValidateIf, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// A single dish carries a STABLE client-minted UUID so the backend can diff
// (insert/update/delete) against existing menu_dishes rows and never disturb a
// dish's product_id link when other dishes change.
export class SyncDishDto {
  @ApiProperty({ description: 'Stable client-minted UUID (becomes menu_dishes.id)' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Dish text' })
  @IsString()
  text: string;
}

export class SyncCourseDto {
  @ApiPropertyOptional({ description: 'menus.id when known (existing course); omitted for new', nullable: true })
  @ValidateIf((o) => o.id !== null && o.id !== undefined)
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: 'Course name (kanji)' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'OCR category hint (ignored server-side; resolved from name)', nullable: true })
  @ValidateIf((o) => o.category !== null && o.category !== undefined)
  @IsString()
  @IsOptional()
  category?: string | null;

  @ApiPropertyOptional({ description: 'Reading / furigana', nullable: true })
  @ValidateIf((o) => o.reading !== null)
  @IsString()
  @IsOptional()
  reading?: string | null;

  @ApiProperty({ description: 'Position in the menu (1-based)' })
  @IsInt()
  sort_order: number;

  @ApiProperty({
    description: 'Sub-columns of dishes (cols[col][row]) — the chef\'s visual layout',
    type: 'array',
    items: { type: 'array', items: { $ref: '#/components/schemas/SyncDishDto' } },
  })
  @IsArray()
  cols: SyncDishDto[][];
}

// Full current state of one scanned menu. Sent (debounced) on every edit; the
// backend diff-upserts menus + menu_dishes so the relational rows ARE the menu.
export class MenuSyncDto {
  @ApiProperty({ description: 'Menu group ID (authoritative unless group_name resolves elsewhere)' })
  @IsString()
  menu_group_id: string;

  @ApiPropertyOptional({ description: 'Group name inferred from title; find-or-create, overrides menu_group_id when set', nullable: true })
  @ValidateIf((o) => o.group_name !== null)
  @IsString()
  @IsOptional()
  group_name?: string | null;

  @ApiPropertyOptional({ description: 'Season name inferred from title (春/夏/秋/冬); find-or-create', nullable: true })
  @ValidateIf((o) => o.season_name !== null)
  @IsString()
  @IsOptional()
  season_name?: string | null;

  @ApiPropertyOptional({ description: 'Menu title → menu_groups.display_title', nullable: true })
  @ValidateIf((o) => o.menu_title !== null)
  @IsString()
  @IsOptional()
  menu_title?: string | null;

  @ApiPropertyOptional({ description: 'Source scan session id (provenance / image)', nullable: true })
  @ValidateIf((o) => o.session_id !== null)
  @IsString()
  @IsOptional()
  session_id?: string | null;

  @ApiProperty({ type: [SyncCourseDto], description: 'Current courses with dish layout' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncCourseDto)
  courses: SyncCourseDto[];

  @ApiPropertyOptional({ description: 'When true, also DELETE dishes/courses absent from this payload (explicit user save). Autosync must omit/false this so it can never wipe data.', nullable: true })
  @IsOptional()
  @IsBoolean()
  prune?: boolean;
}
