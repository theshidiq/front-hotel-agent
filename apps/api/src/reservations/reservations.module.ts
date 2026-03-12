import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { RoomsModule } from '../rooms/rooms.module';
import { AllergensModule } from '../allergens/allergens.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RoomsModule, AllergensModule, AuthModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
