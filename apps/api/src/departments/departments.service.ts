import { Injectable, InternalServerErrorException, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  positions?: Position[];
}

export interface Position {
  id: string;
  organization_id: string;
  department_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

@Injectable()
export class DepartmentsService {
  constructor(private supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  // ── Departments ────────────────────────────────────────────

  async findAllDepartments(organizationId: string): Promise<Department[]> {
    const { data, error } = await this.db
      .from('departments')
      .select('*, positions(*)')
      .eq('organization_id', organizationId)
      .order('sort_order')
      .order('name');

    if (error) throw new InternalServerErrorException(error.message);

    // Sort positions within each department
    return (data || []).map((d) => ({
      ...d,
      positions: (d.positions || []).sort((a: Position, b: Position) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    }));
  }

  async createDepartment(name: string, color: string, sortOrder: number, organizationId: string): Promise<Department> {
    const { data, error } = await this.db
      .from('departments')
      .insert({ organization_id: organizationId, name: name.trim(), color, sort_order: sortOrder })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new ConflictException(`Department "${name}" already exists`);
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async updateDepartment(id: string, updates: Partial<{ name: string; color: string; sort_order: number }>, organizationId: string): Promise<Department> {
    const { data, error } = await this.db
      .from('departments')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new ConflictException('Department name already exists');
      throw new InternalServerErrorException(error.message);
    }
    if (!data) throw new NotFoundException('Department not found');
    return data;
  }

  async deleteDepartment(id: string, organizationId: string): Promise<void> {
    const { error } = await this.db
      .from('departments')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new InternalServerErrorException(error.message);
  }

  // ── Positions ──────────────────────────────────────────────

  async findPositionsByDepartment(departmentId: string, organizationId: string): Promise<Position[]> {
    const { data, error } = await this.db
      .from('positions')
      .select('*')
      .eq('department_id', departmentId)
      .eq('organization_id', organizationId)
      .order('sort_order')
      .order('name');

    if (error) throw new InternalServerErrorException(error.message);
    return data || [];
  }

  async createPosition(departmentId: string, name: string, sortOrder: number, organizationId: string): Promise<Position> {
    const { data, error } = await this.db
      .from('positions')
      .insert({ organization_id: organizationId, department_id: departmentId, name: name.trim(), sort_order: sortOrder })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new ConflictException(`Position "${name}" already exists in this department`);
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async updatePosition(id: string, updates: Partial<{ name: string; sort_order: number }>, organizationId: string): Promise<Position> {
    const { data, error } = await this.db
      .from('positions')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new ConflictException('Position name already exists in this department');
      throw new InternalServerErrorException(error.message);
    }
    if (!data) throw new NotFoundException('Position not found');
    return data;
  }

  async deletePosition(id: string, organizationId: string): Promise<void> {
    const { error } = await this.db
      .from('positions')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new InternalServerErrorException(error.message);
  }
}
