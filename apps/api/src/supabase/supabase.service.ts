import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    @Inject(REQUEST) private readonly request: Request,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Service Key must be defined');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getOrganizationId(): string {
    // Prefer the per-request header, fall back to env var (for single-tenant / local dev)
    const fromHeader = this.request?.headers?.['x-organization-id'] as string;
    const fromEnv = this.configService.get<string>('ORGANIZATION_ID') || '';
    return fromHeader || fromEnv;
  }

  /** @deprecated Use getOrganizationId() instead */
  getRestaurantId(): string {
    const fromHeader = this.request?.headers?.['x-restaurant-id'] as string;
    return fromHeader || this.configService.get<string>('RESTAURANT_ID') || '';
  }

}
