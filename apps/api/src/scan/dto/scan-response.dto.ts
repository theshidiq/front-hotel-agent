import { ApiProperty } from '@nestjs/swagger';

export class ScanSessionResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  restaurant_id: string;

  @ApiProperty()
  image_url: string;

  @ApiProperty()
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiProperty({ required: false })
  product_id?: string;

  @ApiProperty({ required: false })
  error_message?: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}

export class ScanResultResponse {
  @ApiProperty()
  scan_session: ScanSessionResponse;

  @ApiProperty({ required: false })
  product?: {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    ingredients_raw: string | null;
    nutrition_per_100g: Record<string, number> | null;
    storage_instructions: string | null;
    preparation_instructions: string | null;
    is_vegetarian: boolean;
    is_vegan: boolean;
    is_halal: boolean;
    is_gluten_free: boolean;
    image_url: string | null;
    allergens: {
      id: string;
      name: string;
      category: string;
      source: string;
    }[];
  };
}
