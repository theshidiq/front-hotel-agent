import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSeasonalMenuDto } from './create-seasonal-menu.dto';

export class UpdateSeasonalMenuDto extends PartialType(CreateSeasonalMenuDto) {
  @ApiPropertyOptional({ description: 'Is the seasonal menu active' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
