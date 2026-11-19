import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsUUID } from 'class-validator';

export class GuestUpdateDto {
  @ApiProperty({ type: [String], required: false, description: 'Allergen IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allergen_ids?: string[];

  @ApiProperty({ required: false, description: 'Dietary notes' })
  @IsOptional()
  @IsString()
  dietary_notes?: string;

  @ApiProperty({ required: false, description: 'Special requests' })
  @IsOptional()
  @IsString()
  special_requests?: string;
}
