import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface PeriodJson {
  year: number;
  month: number;
  day: number;
}

export interface Staff {
  id: string;
  restaurant_id: string;
  name: string;
  email: string;
  position: string | null;
  is_active: boolean;
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

  async findAll(): Promise<Staff[]> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data, error } = await supabase
      .from('staff')
      .select('id, restaurant_id, name, email, position, is_active, start_period, end_period, created_at')
      .eq('restaurant_id', restaurantId)
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
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data, error } = await supabase
      .from('staff')
      .update({ email: email.trim().toLowerCase() })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select('id, restaurant_id, name, email, position, is_active, start_period, end_period, created_at')
      .single();

    if (error) {
      this.logger.error(`Failed to update staff email: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update staff email: ${error.message}`);
    }

    return data;
  }

  async create(name: string, email: string, position: string): Promise<Staff> {
    const supabase = this.supabaseService.getClient();
    const restaurantId = this.supabaseService.getRestaurantId();

    const { data, error } = await supabase
      .from('staff')
      .insert({ restaurant_id: restaurantId, name: name.trim(), email: email.trim().toLowerCase(), position: position.trim() })
      .select('id, restaurant_id, name, email, position, is_active, start_period, end_period, created_at')
      .single();

    if (error) {
      this.logger.error(`Failed to register staff: ${error.message}`);
      throw new InternalServerErrorException(`Failed to register staff: ${error.message}`);
    }

    return data;
  }
}
