import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PermissionGuard } from './permission.guard';

export const PERMISSIONS_KEY = 'permissions';
export const IS_PUBLIC_KEY = 'isPublic';

/** Mark an endpoint as public — skips JwtAuthGuard entirely. */
export const SkipAuth = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Require specific permissions to access an endpoint.
 * Admin users bypass all permission checks.
 *
 * Usage:
 *   @RequirePermission('products.create')
 *   @RequirePermission('products.edit', 'products.create')  // requires at least one
 */
export function RequirePermission(...permissions: string[]) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(PermissionGuard),
    ApiBearerAuth(),
  );
}
