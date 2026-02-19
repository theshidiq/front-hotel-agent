import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export const ALL_PERMISSIONS = [
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'products.scan',
  'menus.view',
  'menus.create',
  'menus.edit',
  'menus.delete',
  'menus.structure',
  'allergens.view',
  'allergens.manage',
  'reports.print',
  'reports.export',
  'categories.manage',
  'staff.manage',
  'reservations.view',
  'reservations.checkin',
  'reservations.checkout',
  'reservations.create',
  'rooms.view',
  'notifications.view',
  'notifications.manage',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export interface Role {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  permissions: string[];
}

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<Role[]> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name');

    if (error) {
      throw new InternalServerErrorException(`Failed to fetch roles: ${error.message}`);
    }

    if (!roles || roles.length === 0) {
      return [];
    }

    // Batch load permissions for all roles in one query
    const roleIds = roles.map((r) => r.id);
    const { data: allPerms } = await supabase
      .from('role_permissions')
      .select('role_id, permission')
      .in('role_id', roleIds);

    const permsByRole = new Map<string, string[]>();
    for (const perm of allPerms || []) {
      const existing = permsByRole.get(perm.role_id) || [];
      existing.push(perm.permission);
      permsByRole.set(perm.role_id, existing);
    }

    return roles.map((r) => ({
      ...r,
      permissions: permsByRole.get(r.id) || [],
    }));
  }

  async findOne(id: string): Promise<Role> {
    const supabase = this.supabaseService.getClient();

    // Parallel fetch: role + permissions
    const [roleResult, permsResult] = await Promise.all([
      supabase.from('roles').select('*').eq('id', id).single(),
      supabase.from('role_permissions').select('permission').eq('role_id', id),
    ]);

    if (roleResult.error || !roleResult.data) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    return {
      ...roleResult.data,
      permissions: (permsResult.data || []).map((p) => p.permission),
    };
  }

  async create(
    name: string,
    description?: string,
    permissions?: string[],
  ): Promise<Role> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        throw new BadRequestException(`Role "${name}" already exists`);
      }
      throw new InternalServerErrorException(`Failed to create role: ${error.message}`);
    }

    // Add permissions if provided
    const validPerms = (permissions || []).filter((p) =>
      ALL_PERMISSIONS.includes(p as Permission),
    );

    if (validPerms.length > 0) {
      await supabase.from('role_permissions').insert(
        validPerms.map((p) => ({ role_id: role.id, permission: p })),
      );
    }

    return {
      ...role,
      permissions: validPerms,
    };
  }

  async update(id: string, name?: string, description?: string): Promise<Role> {
    const supabase = this.supabaseService.getClient();

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    const { error } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', id);

    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        throw new BadRequestException(`Role name "${name}" already exists`);
      }
      throw new InternalServerErrorException(`Failed to update role: ${error.message}`);
    }

    return this.findOne(id);
  }

  async updatePermissions(id: string, permissions: string[]): Promise<Role> {
    const supabase = this.supabaseService.getClient();

    // Validate permissions
    const validPerms = permissions.filter((p) =>
      ALL_PERMISSIONS.includes(p as Permission),
    );

    // Delete all existing + get role data in parallel
    const [, roleResult] = await Promise.all([
      supabase.from('role_permissions').delete().eq('role_id', id),
      supabase.from('roles').select('*').eq('id', id).single(),
    ]);

    if (roleResult.error || !roleResult.data) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    // Insert new permissions
    if (validPerms.length > 0) {
      const { error } = await supabase.from('role_permissions').insert(
        validPerms.map((p) => ({ role_id: id, permission: p })),
      );
      if (error) {
        throw new InternalServerErrorException(`Failed to update permissions: ${error.message}`);
      }
    }

    this.logger.log(`Updated role ${id} permissions: [${validPerms.join(', ')}]`);

    return {
      ...roleResult.data,
      permissions: validPerms,
    };
  }

  async findDefault(): Promise<Role | null> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data: role } = await supabase
      .from('roles')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_default', true)
      .single();

    if (!role) return null;

    const { data: perms } = await supabase
      .from('role_permissions')
      .select('permission')
      .eq('role_id', role.id);

    return {
      ...role,
      permissions: (perms || []).map((p) => p.permission),
    };
  }

  async setDefault(id: string): Promise<Role> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    // Clear existing default + validate role exists in parallel
    const [, roleResult] = await Promise.all([
      supabase
        .from('roles')
        .update({ is_default: false })
        .eq('restaurant_id', restaurantId)
        .eq('is_default', true),
      this.findOne(id),
    ]);

    // Set the new default
    const { error } = await supabase
      .from('roles')
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(`Failed to set default role: ${error.message}`);
    }

    this.logger.log(`Set role ${id} as default guest role`);

    return {
      ...roleResult,
      is_default: true,
    };
  }

  async clearDefault(): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    await supabase
      .from('roles')
      .update({ is_default: false })
      .eq('restaurant_id', restaurantId)
      .eq('is_default', true);
  }

  async remove(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    // Check if any staff are assigned to this role
    const { data: assignedStaff } = await supabase
      .from('staff')
      .select('id')
      .eq('role_id', id)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .limit(1);

    if (assignedStaff && assignedStaff.length > 0) {
      throw new BadRequestException(
        'Cannot delete role that has staff assigned. Reassign staff first.',
      );
    }

    const { error } = await supabase.from('roles').delete().eq('id', id);

    if (error) {
      throw new InternalServerErrorException(`Failed to delete role: ${error.message}`);
    }
  }
}
