import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface PeriodJson {
  year: number;
  month: number;
  day: number;
}

const STAFF_FIELDS = 'id, organization_id, name, email, position, department_id, position_id, is_active, is_admin, role_id, employment_type, start_period, end_period, created_at';

export interface Staff {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  position: string | null;
  department_id: string | null;
  position_id: string | null;
  is_active: boolean;
  is_admin: boolean;
  role_id: string | null;
  employment_type: string | null;
  start_period: PeriodJson | null;
  end_period: PeriodJson | null;
  created_at: string;
}

@Injectable()
export class StaffsService {
  private readonly logger = new Logger(StaffsService.name);

  constructor(private supabaseService: SupabaseService) {}

  private periodToDate(p: PeriodJson): Date {
    return new Date(p.year, p.month - 1, p.day);
  }

  private isWithinActivePeriod(staff: Staff): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (staff.start_period) {
      const start = this.periodToDate(staff.start_period);
      if (start > today) return false;
    }

    if (staff.end_period) {
      const end = this.periodToDate(staff.end_period);
      if (end < today) return false;
    }

    return true;
  }

  private async autoDeactivateExpired(): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const d = today.getDate();

    // Use DB-side JSONB comparison to find expired staff
    const { data, error } = await supabase
      .from('staff')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .not('end_period', 'is', null)
      .or(
        `end_period->year.lt.${y},` +
        `and(end_period->year.eq.${y},end_period->month.lt.${m}),` +
        `and(end_period->year.eq.${y},end_period->month.eq.${m},end_period->day.lt.${d})`,
      );

    if (error || !data?.length) return;

    const ids = data.map((s) => s.id);

    await supabase
      .from('staff')
      .update({ is_active: false })
      .in('id', ids)
      .eq('organization_id', organizationId);

    this.logger.log(`Auto-deactivated ${ids.length} expired staff: ${data.map((s) => s.name).join(', ')}`);
  }

  async findAll(): Promise<Staff[]> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { data, error } = await supabase
      .from('staff')
      .select(STAFF_FIELDS)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      this.logger.error(`Failed to fetch staff: ${error.message}`);
      throw new InternalServerErrorException(`Failed to fetch staff: ${error.message}`);
    }

    // Filter by active period
    return (data || []).filter((s) => this.isWithinActivePeriod(s));
  }

  async updateEmail(id: string, email: string): Promise<Staff> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { data, error } = await supabase
      .from('staff')
      .update({ email: email.trim().toLowerCase() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(STAFF_FIELDS)
      .single();

    if (error) {
      this.logger.error(`Failed to update staff email: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update staff email: ${error.message}`);
    }

    return data;
  }

  async create(name: string, email: string, position: string, departmentId?: string | null, positionId?: string | null): Promise<Staff> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { data, error } = await supabase
      .from('staff')
      .insert({
        organization_id: organizationId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        position: position.trim(),
        department_id: departmentId ?? null,
        position_id: positionId ?? null,
      })
      .select(STAFF_FIELDS)
      .single();

    if (error) {
      this.logger.error(`Failed to register staff: ${error.message}`);
      throw new InternalServerErrorException(`Failed to register staff: ${error.message}`);
    }

    return data;
  }

  async updateOrg(id: string, updates: { name?: string; position?: string; department_id?: string | null; position_id?: string | null; is_active?: boolean; employment_type?: string | null; start_period?: PeriodJson | null; end_period?: PeriodJson | null }): Promise<Staff> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(STAFF_FIELDS)
      .single();

    if (error) {
      this.logger.error(`Failed to update staff: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update staff: ${error.message}`);
    }

    return data;
  }

  async findAllIncludingInactive(): Promise<Staff[]> {
    // Auto-deactivate any staff whose end_period has passed before returning
    await this.autoDeactivateExpired();

    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { data, error } = await supabase
      .from('staff')
      .select(STAFF_FIELDS)
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      this.logger.error(`Failed to fetch staff: ${error.message}`);
      throw new InternalServerErrorException(`Failed to fetch staff: ${error.message}`);
    }

    return data || [];
  }

  async deleteStaff(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { error } = await supabase
      .from('staff')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to deactivate staff: ${error.message}`);
      throw new InternalServerErrorException(`Failed to deactivate staff: ${error.message}`);
    }
  }

  async hardDeleteStaff(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .eq('is_active', false); // Safety: only allow deleting inactive staff

    if (error) {
      this.logger.error(`Failed to hard delete staff: ${error.message}`);
      throw new InternalServerErrorException(`Failed to hard delete staff: ${error.message}`);
    }
  }

  async updateRole(id: string, roleId: string | null): Promise<Staff> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    const { data, error } = await supabase
      .from('staff')
      .update({ role_id: roleId })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(STAFF_FIELDS)
      .single();

    if (error) {
      this.logger.error(`Failed to update staff role: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update staff role: ${error.message}`);
    }

    return data;
  }

  async updateAdmin(id: string, isAdmin: boolean, requestingStaffId: string): Promise<Staff> {
    const supabase = this.supabaseService.getClient();
    const organizationId = this.supabaseService.getOrganizationId();

    // Safety: cannot demote yourself
    if (!isAdmin && id === requestingStaffId) {
      throw new BadRequestException('Cannot remove your own admin access');
    }

    // Safety: cannot remove the last admin
    if (!isAdmin) {
      const { data: admins } = await supabase
        .from('staff')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('is_admin', true);

      if (admins && admins.length <= 1) {
        throw new BadRequestException('Cannot remove the last admin. Promote another admin first.');
      }
    }

    const { data, error } = await supabase
      .from('staff')
      .update({ is_admin: isAdmin })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(STAFF_FIELDS)
      .single();

    if (error) {
      this.logger.error(`Failed to update admin status: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update admin status: ${error.message}`);
    }

    this.logger.log(`Staff ${id} admin status set to ${isAdmin}`);
    return data;
  }
}
