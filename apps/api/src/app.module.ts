import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { AllergensModule } from './allergens/allergens.module';
import { QwenModule } from './qwen/qwen.module';
import { ScanModule } from './scan/scan.module';
import { ProductsModule } from './products/products.module';
import { MenusModule } from './menus/menus.module';
import { RoomsModule } from './rooms/rooms.module';
import { ReservationsModule } from './reservations/reservations.module';
import { GuestAlertsModule } from './guest-alerts/guest-alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    HttpModule,
    SupabaseModule,
    AllergensModule,
    QwenModule,
    ScanModule,
    ProductsModule,
    MenusModule,
    RoomsModule,
    ReservationsModule,
    GuestAlertsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
