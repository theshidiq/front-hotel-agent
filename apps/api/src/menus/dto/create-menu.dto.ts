import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiProperty({ description: 'Menu item name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Menu item description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Price in local currency' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    description: 'Menu category',
    enum: [
      'appetizer',
      'main',
      'dessert',
      'beverage',
      'side',
      'special',
      'other',
    ],
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Menu item image URL' })
  @IsUrl()
  @IsOptional()
  image_url?: string;

  @ApiPropertyOptional({ description: 'Is menu item available', default: true })
  @IsBoolean()
  @IsOptional()
  is_available?: boolean;

  @ApiPropertyOptional({
    description: 'Array of product IDs to link as ingredients',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  product_ids?: string[];
}
