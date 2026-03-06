import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AllergenInfo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  source: string;
}

export class ProductResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organization_id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  brand: string | null;

  @ApiPropertyOptional()
  category: string | null;

  @ApiPropertyOptional()
  ingredients_raw: string | null;

  @ApiPropertyOptional()
  nutrition_per_100g: Record<string, number> | null;

  @ApiPropertyOptional()
  storage_instructions: string | null;

  @ApiPropertyOptional()
  preparation_instructions: string | null;

  @ApiProperty()
  is_vegetarian: boolean;

  @ApiProperty()
  is_vegan: boolean;

  @ApiProperty()
  is_halal: boolean;

  @ApiProperty()
  is_gluten_free: boolean;

  @ApiPropertyOptional()
  image_url: string | null;

  @ApiProperty({ type: [AllergenInfo] })
  allergens: AllergenInfo[];

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}
