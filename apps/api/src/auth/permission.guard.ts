import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';
import { PERMISSIONS_KEY } from './permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const supabase = this.supabaseService.getClient();

    // Verify JWT with Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      this.logger.warn(`Invalid token: ${authError?.message || 'No user'}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    const email = user.email;
    if (!email) {
      throw new UnauthorizedException('No email associated with this account');
    }

    // Check if this user is a staff member — look up by email only (no org filter)
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, email, position, is_admin, role_id, organization_id')
      .eq('email', email)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (staffError || !staff) {
      this.logger.warn(`Non-staff login attempt: ${email}`);
      throw new UnauthorizedException('You are not registered as staff');
    }

    // Organization ID must come from the staff record — never from client-supplied headers
    const organizationId: string | null = staff.organization_id ?? null;
    if (!organizationId) {
      this.logger.warn(`Staff ${staff.email} has no organization_id — denying access`);
      throw new ForbiddenException('Staff account is not associated with an organization');
    }

    // Load permissions from role
    let permissions: string[] = [];
    let roleName: string | null = null;
    if (staff.role_id) {
      const { data: role } = await supabase
        .from('roles')
        .select('name')
        .eq('id', staff.role_id)
        .single();
      roleName = role?.name ?? null;

      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role_id', staff.role_id);
      permissions = (rolePerms || []).map((rp) => rp.permission);
    }

    // Attach user info to request
    request.user = {
      authId: user.id,
      email: staff.email,
      staffId: staff.id,
      name: staff.name,
      position: staff.position,
      isAdmin: staff.is_admin ?? false,
      roleId: staff.role_id,
      roleName,
      permissions,
      organization_id: organizationId,
    };

    // Check required permissions
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions specified, just require authenticated staff
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Admin bypasses all permission checks
    if (request.user.isAdmin) {
      return true;
    }

    // Check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some((p) =>
      permissions.includes(p),
    );

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied for ${email}: requires [${requiredPermissions.join(', ')}], has [${permissions.join(', ')}]`,
      );
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
