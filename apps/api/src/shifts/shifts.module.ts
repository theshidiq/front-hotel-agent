import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { ORToolsClient } from './ortools.client';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
    AuthModule,
  ],
  controllers: [ShiftsController],
  providers: [
    ShiftsService,
    ORToolsClient,
  ],
  exports: [ShiftsService],
})
export class ShiftsModule {}
