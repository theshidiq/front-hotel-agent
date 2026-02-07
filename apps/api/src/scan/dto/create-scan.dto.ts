import { IsString, IsUrl, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScanDto {
  @ApiProperty({
    description: 'URL of the product image to scan',
    example:
      'https://ymdyejrljmvajqjbejvh.supabase.co/storage/v1/object/public/product-images/example.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  imageUrl: string;
}
