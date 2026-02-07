import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { RoomsModule } from '../rooms/rooms.module';
import { AllergensModule } from '../allergens/allergens.module';

@Module({
  imports: [RoomsModule, AllergensModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
