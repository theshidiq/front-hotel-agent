import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type MenuCourseCategory =
  | 'appetizer'
  | 'main'
  | 'dessert'
  | 'beverage'
  | 'side'
  | 'special'
  | 'other';

export const VALID_CATEGORIES: MenuCourseCategory[] = [
  'appetizer',
  'main',
  'dessert',
  'beverage',
  'side',
  'special',
  'other',
];

export class ExtractedCourse {
  @ApiProperty({ description: 'Course name in kanji (e.g. 先付、前菜)' })
  name: string;

  @ApiPropertyOptional({ description: 'Reading in hiragana (e.g. さきづけ)' })
  reading: string | null;

  @ApiPropertyOptional({ description: 'Dish details / description' })
  description: string | null;

  @ApiProperty({
    description: 'Mapped menu category',
    enum: VALID_CATEGORIES,
  })
  category: MenuCourseCategory;

  @ApiProperty({ description: 'Position in the original menu (1-based)' })
  sort_order: number;
}

export class MenuScanExtractResponse {
  @ApiProperty({ type: [ExtractedCourse] })
  courses: ExtractedCourse[];

  @ApiPropertyOptional({ description: 'Detected menu title (e.g. 夏の献立)' })
  menu_title: string | null;

  @ApiProperty({ description: 'Public URL of the uploaded image' })
  image_url: string;

  @ApiPropertyOptional({ description: 'Draft session ID (auto-saved after OCR)' })
  session_id?: string;
}

export class MenuScanDraft {
  @ApiProperty()
  session_id: string;

  @ApiProperty()
  menu_group_id: string;

  @ApiPropertyOptional()
  menu_title: string | null;

  @ApiProperty({ type: [ExtractedCourse] })
  courses: ExtractedCourse[];

  @ApiProperty()
  image_url: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}
