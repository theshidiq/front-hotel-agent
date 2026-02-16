import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class StaffAuthGuard implements CanActivate {
  private readonly logger = new Logger(StaffAuthGuard.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
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

    // Check if this user is a staff member
    const restaurantId = this.supabaseService.getRestaurantId();
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, email, position, is_admin, role_id')
      .eq('email', email)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (staffError || !staff) {
      this.logger.warn(`Non-staff login attempt: ${email}`);
      throw new UnauthorizedException('You are not registered as staff');
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
    };

    return true;
  }
}
