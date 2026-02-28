import { Module } from '@nestjs/common';
import { StaffAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [StaffAuthGuard, PermissionGuard, WsJwtGuard],
  exports: [StaffAuthGuard, PermissionGuard, WsJwtGuard],
})
export class AuthModule {}
