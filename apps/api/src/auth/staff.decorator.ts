import { applyDecorators, UseGuards } from '@nestjs/common';
import { StaffAuthGuard } from './auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

export function RequireStaff() {
  return applyDecorators(UseGuards(StaffAuthGuard), ApiBearerAuth());
}
