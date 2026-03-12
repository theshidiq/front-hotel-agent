import { Module } from '@nestjs/common';
import { GuestAlertsController } from './guest-alerts.controller';
import { GuestAlertsService } from './guest-alerts.service';
import { AllergensModule } from '../allergens/allergens.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AllergensModule, AuthModule],
  controllers: [GuestAlertsController],
  providers: [GuestAlertsService],
  exports: [GuestAlertsService],
})
export class GuestAlertsModule {}
