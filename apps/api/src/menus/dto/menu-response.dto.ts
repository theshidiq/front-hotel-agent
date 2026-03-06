import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllergenInfo } from '../../products/dto/product-response.dto';

export class MenuProductInfo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  brand: string | null;

  @ApiPropertyOptional()
  category: string | null;

  @ApiProperty({ type: [AllergenInfo] })
  allergens: AllergenInfo[];
}

export class MenuResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organization_id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  price: number | null;

  @ApiPropertyOptional()
  category: string | null;

  @ApiPropertyOptional()
  seasonal_menu_id: string | null;

  @ApiPropertyOptional()
  menu_group_id: string | null;

  @ApiPropertyOptional()
  image_url: string | null;

  @ApiProperty()
  is_available: boolean;

  @ApiProperty({ type: [MenuProductInfo] })
  products: MenuProductInfo[];

  @ApiProperty({
    type: [AllergenInfo],
    description: 'Derived from all linked products',
  })
  allergens: AllergenInfo[];

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}
