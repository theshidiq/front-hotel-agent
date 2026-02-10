import { Module } from '@nestjs/common';
import { StaffAuthGuard } from './auth.guard';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [StaffAuthGuard],
  exports: [StaffAuthGuard],
})
export class AuthModule {}
