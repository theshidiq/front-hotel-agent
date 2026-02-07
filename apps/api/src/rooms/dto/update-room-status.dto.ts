import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateRoomStatusDto {
  @ApiProperty({ enum: ['available', 'occupied', 'cleaning', 'maintenance', 'out_of_order'] })
  @IsString()
  @IsIn(['available', 'occupied', 'cleaning', 'maintenance', 'out_of_order'])
  status: string;
}
