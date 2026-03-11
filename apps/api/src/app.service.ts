import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';

@Injectable()
export class AppService {
  constructor(private readonly supabaseService: SupabaseService) {}

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async findOrgBySlug(slug: string): Promise<{ id: string; name: string; display_name: string | null } | null> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('organizations')
      .select('id, name, display_name')
      .eq('slug', slug)
      .single();
    return data ?? null;
  }
}
