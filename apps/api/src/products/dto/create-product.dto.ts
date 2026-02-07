import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsObject,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Brand or manufacturer name' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Product category',
    enum: [
      'frozen',
      'fresh',
      'beverage',
      'condiment',
      'snack',
      'prepared',
      'ingredient',
      'other',
    ],
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Raw ingredients text from label' })
  @IsString()
  @IsOptional()
  ingredients_raw?: string;

  @ApiPropertyOptional({
    description: 'Nutrition information per 100g',
    example: { calories: 100, protein: 5, fat: 3, carbs: 15, sodium: 200 },
  })
  @IsObject()
  @IsOptional()
  nutrition_per_100g?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Storage instructions' })
  @IsString()
  @IsOptional()
  storage_instructions?: string;

  @ApiPropertyOptional({ description: 'Preparation instructions' })
  @IsString()
  @IsOptional()
  preparation_instructions?: string;

  @ApiPropertyOptional({ description: 'Is vegetarian', default: false })
  @IsBoolean()
  @IsOptional()
  is_vegetarian?: boolean;

  @ApiPropertyOptional({ description: 'Is vegan', default: false })
  @IsBoolean()
  @IsOptional()
  is_vegan?: boolean;

  @ApiPropertyOptional({ description: 'Is halal', default: false })
  @IsBoolean()
  @IsOptional()
  is_halal?: boolean;

  @ApiPropertyOptional({ description: 'Is gluten-free', default: false })
  @IsBoolean()
  @IsOptional()
  is_gluten_free?: boolean;

  @ApiPropertyOptional({ description: 'Product image URL' })
  @IsUrl()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({
    description: 'Array of allergen IDs to link',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergen_ids?: string[];
}
