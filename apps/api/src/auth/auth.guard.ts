import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface CachedUser {
  user: any;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000; // 30 seconds

@Injectable()
export class StaffAuthGuard implements CanActivate {
  private readonly logger = new Logger(StaffAuthGuard.name);
  private readonly cache = new Map<string, CachedUser>();

  constructor(private readonly supabaseService: SupabaseService) {}

  private getCached(token: string): any | null {
    const entry = this.cache.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(token);
      return null;
    }
    return entry.user;
  }

  private setCached(token: string, user: any): void {
    this.cache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Return cached user data to avoid redundant Supabase calls on parallel requests
    const cached = this.getCached(token);
    if (cached) {
      request.user = cached;
      return true;
    }

    const supabase = this.supabaseService.getClient();

    // Verify the JWT with Supabase Auth
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
    // The org is derived from the staff record itself, not from client headers
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
      this.logger.warn(`Staff ${email} has no organization_id — denying access`);
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

    // Attach staff info to request for use in controllers
    const userData = {
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

    this.setCached(token, userData);
    request.user = userData;

    return true;
  }
}
