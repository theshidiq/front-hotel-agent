import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { CategoriesModule } from './categories/categories.module';
import { MenuGroupsModule } from './menu-groups/menu-groups.module';
import { AuthModule } from './auth/auth.module';
import { StaffsModule } from './staffs/staffs.module';
import { SeasonalMenusModule } from './seasonal-menus/seasonal-menus.module';
import { ProductAlternatesModule } from './product-alternates/product-alternates.module';
import { RolesModule } from './roles/roles.module';
import { ShiftsModule } from './shifts/shifts.module';
import { DepartmentsModule } from './departments/departments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '../../.env',
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 300 },
      { name: 'scan', ttl: 60000, limit: 10 },
    ]),
    HttpModule,
    SupabaseModule,
    AuthModule,
    AllergensModule,
    QwenModule,
    ScanModule,
    ProductsModule,
    MenusModule,
    RoomsModule,
    ReservationsModule,
    GuestAlertsModule,
    CategoriesModule,
    MenuGroupsModule,
    StaffsModule,
    SeasonalMenusModule,
    ProductAlternatesModule,
    RolesModule,
    ShiftsModule,
    DepartmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
