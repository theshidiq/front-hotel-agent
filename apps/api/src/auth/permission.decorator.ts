import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PermissionGuard } from './permission.guard';

export const PERMISSIONS_KEY = 'permissions';

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
