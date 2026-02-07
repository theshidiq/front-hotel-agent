import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class AcknowledgeAlertDto {
  @ApiProperty({ required: false, description: 'Staff member who acknowledged' })
  @IsOptional()
  @IsString()
  acknowledged_by?: string;
}
