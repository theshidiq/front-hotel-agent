/**
 * Unit tests for shift symbol config methods in ShiftsService:
 *   - getShiftSymbolConfig
 *   - updateShiftSymbolConfig
 *
 * These tests mock SupabaseService.getClient() to avoid hitting the real DB.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ORToolsClient } from './ortools.client';
import { UpdateShiftSymbolConfigDto } from './dto/settings.dto';

// ---------------------------------------------------------------------------
// Helpers to build a chainable Supabase query mock
// ---------------------------------------------------------------------------

function makeQueryMock(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  const terminal = jest.fn().mockResolvedValue(result);

  ['from', 'select', 'eq', 'single', 'upsert', 'insert', 'update', 'order'].forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });

  // .single() and .upsert() terminate and return the result
  chain['single'] = terminal;

  // For upsert().select().single() chain
  const selectAfterUpsert: Record<string, jest.Mock> = {};
  selectAfterUpsert['single'] = terminal;
  chain['upsert'] = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({ single: terminal }),
  });

  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShiftsService — shift symbol config', () => {
  let service: ShiftsService;
  let mockSupabaseClient: ReturnType<typeof makeQueryMock>;

  const ORG_ID = 'org-uuid-1234';

  const SAMPLE_SYMBOLS = [
    { symbol: '×', label: '休み',  color: '#dc2626', enabled: true,  isDefault: true },
    { symbol: '△', label: '早番',  color: '#2563eb', enabled: true,  isDefault: true },
    { symbol: '◆', label: '夜番',  color: '#7c3aed', enabled: true,  isDefault: false },
  ];

  async function buildService(supabaseResult: { data: unknown; error: unknown }) {
    mockSupabaseClient = makeQueryMock(supabaseResult);

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    };

    const mockORToolsClient = {
      optimize: jest.fn(),
      checkHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ORToolsClient, useValue: mockORToolsClient },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // getShiftSymbolConfig
  // ─────────────────────────────────────────────────────────────────────────

  describe('getShiftSymbolConfig', () => {
    it('returns the DB row symbols when a row exists for the org', async () => {
      const dbRow = { id: 'row-1', organization_id: ORG_ID, symbols: SAMPLE_SYMBOLS };
      await buildService({ data: dbRow, error: null });

      const result = await service.getShiftSymbolConfig(ORG_ID);

      expect(result).toEqual(dbRow);
      expect(result.symbols).toHaveLength(3);
      expect(result.symbols[2].isDefault).toBe(false);
    });

    it('returns default symbols when no row exists (PGRST116 — no rows found)', async () => {
      await buildService({ data: null, error: { code: 'PGRST116', message: 'No rows' } });

      const result = await service.getShiftSymbolConfig(ORG_ID);

      // Should fall back to the built-in DEFAULT_SHIFT_SYMBOLS (10 entries)
      expect(result).toHaveProperty('symbols');
      expect(Array.isArray((result as any).symbols)).toBe(true);
      expect((result as any).symbols.length).toBeGreaterThanOrEqual(1);
      // All defaults must have isDefault: true
      for (const sym of (result as any).symbols) {
        expect(sym.isDefault).toBe(true);
      }
    });

    it('still returns defaults when data is null with a non-PGRST116 error', async () => {
      // Non-fatal errors (e.g. network blip) — service logs but doesn't throw,
      // so we still get the default fallback
      await buildService({ data: null, error: { code: 'SOME_OTHER_CODE', message: 'DB error' } });

      const result = await service.getShiftSymbolConfig(ORG_ID);

      expect(result).toHaveProperty('symbols');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateShiftSymbolConfig
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateShiftSymbolConfig', () => {
    it('upserts and returns the saved row on success', async () => {
      const savedRow = { id: 'row-2', organization_id: ORG_ID, symbols: SAMPLE_SYMBOLS };
      await buildService({ data: savedRow, error: null });

      const dto: UpdateShiftSymbolConfigDto = { symbols: SAMPLE_SYMBOLS as any };
      const result = await service.updateShiftSymbolConfig(ORG_ID, dto);

      expect(result).toEqual(savedRow);
    });

    it('throws BadRequestException when upsert returns an error', async () => {
      await buildService({ data: null, error: { code: '42P01', message: 'relation does not exist' } });

      const dto: UpdateShiftSymbolConfigDto = { symbols: SAMPLE_SYMBOLS as any };

      await expect(service.updateShiftSymbolConfig(ORG_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('saves a custom (non-default) symbol alongside built-in ones', async () => {
      const withCustom = [
        ...SAMPLE_SYMBOLS,
        { symbol: '◉', label: 'カスタム', color: '#f59e0b', enabled: true, isDefault: false },
      ];
      const savedRow = { id: 'row-3', organization_id: ORG_ID, symbols: withCustom };
      await buildService({ data: savedRow, error: null });

      const dto: UpdateShiftSymbolConfigDto = { symbols: withCustom as any };
      const result = await service.updateShiftSymbolConfig(ORG_ID, dto);

      expect(result.symbols).toHaveLength(4);
      expect(result.symbols.find((s: any) => s.symbol === '◉')?.isDefault).toBe(false);
    });

    it('saves a config with a disabled built-in symbol', async () => {
      const withDisabled = SAMPLE_SYMBOLS.map((s) =>
        s.symbol === '△' ? { ...s, enabled: false } : s,
      );
      const savedRow = { id: 'row-4', organization_id: ORG_ID, symbols: withDisabled };
      await buildService({ data: savedRow, error: null });

      const dto: UpdateShiftSymbolConfigDto = { symbols: withDisabled as any };
      const result = await service.updateShiftSymbolConfig(ORG_ID, dto);

      const triangle = result.symbols.find((s: any) => s.symbol === '△');
      expect(triangle?.enabled).toBe(false);
    });

    it('saves an updated label for a built-in symbol', async () => {
      const renamed = SAMPLE_SYMBOLS.map((s) =>
        s.symbol === '×' ? { ...s, label: 'お休み' } : s,
      );
      const savedRow = { id: 'row-5', organization_id: ORG_ID, symbols: renamed };
      await buildService({ data: savedRow, error: null });

      const dto: UpdateShiftSymbolConfigDto = { symbols: renamed as any };
      const result = await service.updateShiftSymbolConfig(ORG_ID, dto);

      const cross = result.symbols.find((s: any) => s.symbol === '×');
      expect(cross?.label).toBe('お休み');
    });
  });
});
