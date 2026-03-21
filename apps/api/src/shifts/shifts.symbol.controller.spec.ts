/**
 * Unit tests for shift symbol config controller routes:
 *   GET  /shifts/settings/shift-symbols
 *   PUT  /shifts/settings/shift-symbols
 *
 * ShiftsService is fully mocked — these tests verify the controller wiring only.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { UpdateShiftSymbolConfigDto } from './dto/settings.dto';

// ---------------------------------------------------------------------------
// Minimal ShiftsService mock — only the methods under test
// ---------------------------------------------------------------------------
const mockShiftsService = {
  getShiftSymbolConfig: jest.fn(),
  updateShiftSymbolConfig: jest.fn(),
};

// Fake JWT user object injected via @GetUser()
const FAKE_USER = { organization_id: 'org-abc-999' };

const SAMPLE_SYMBOLS = [
  { symbol: '×', label: '休み',  color: '#dc2626', enabled: true,  isDefault: true },
  { symbol: '△', label: '早番',  color: '#2563eb', enabled: true,  isDefault: true },
  { symbol: '◆', label: '夜番',  color: '#7c3aed', enabled: true,  isDefault: false },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShiftsController — shift symbol config routes', () => {
  let controller: ShiftsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftsController],
      providers: [
        { provide: ShiftsService, useValue: mockShiftsService },
      ],
    })
      // Bypass JwtAuthGuard and ThrottlerGuard so we don't need a full app context
      .overrideGuard(require('../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('@nestjs/throttler').ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ShiftsController>(ShiftsController);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /shifts/settings/shift-symbols
  // ─────────────────────────────────────────────────────────────────────────

  describe('getShiftSymbols', () => {
    it('calls getShiftSymbolConfig with the user organisation_id and returns the result', async () => {
      const expected = { symbols: SAMPLE_SYMBOLS };
      mockShiftsService.getShiftSymbolConfig.mockResolvedValue(expected);

      const result = await controller.getShiftSymbols(FAKE_USER);

      expect(mockShiftsService.getShiftSymbolConfig).toHaveBeenCalledWith(FAKE_USER.organization_id);
      expect(result).toEqual(expected);
    });

    it('returns default symbols object when service finds no saved config', async () => {
      const defaults = { symbols: [{ symbol: '×', label: '休み', color: '#dc2626', enabled: true, isDefault: true }] };
      mockShiftsService.getShiftSymbolConfig.mockResolvedValue(defaults);

      const result = await controller.getShiftSymbols(FAKE_USER);

      expect(result).toEqual(defaults);
    });

    it('propagates errors thrown by the service', async () => {
      mockShiftsService.getShiftSymbolConfig.mockRejectedValue(new Error('DB unavailable'));

      await expect(controller.getShiftSymbols(FAKE_USER)).rejects.toThrow('DB unavailable');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PUT /shifts/settings/shift-symbols
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateShiftSymbols', () => {
    it('calls updateShiftSymbolConfig with org_id and dto, returns saved row', async () => {
      const saved = { id: 'row-1', organization_id: FAKE_USER.organization_id, symbols: SAMPLE_SYMBOLS };
      mockShiftsService.updateShiftSymbolConfig.mockResolvedValue(saved);

      const dto: UpdateShiftSymbolConfigDto = { symbols: SAMPLE_SYMBOLS as any };
      const result = await controller.updateShiftSymbols(FAKE_USER, dto);

      expect(mockShiftsService.updateShiftSymbolConfig).toHaveBeenCalledWith(
        FAKE_USER.organization_id,
        dto,
      );
      expect(result).toEqual(saved);
    });

    it('only passes the requesting user\'s org_id — not a different org', async () => {
      mockShiftsService.updateShiftSymbolConfig.mockResolvedValue({});

      const dto: UpdateShiftSymbolConfigDto = { symbols: [] as any };
      await controller.updateShiftSymbols(FAKE_USER, dto);

      const [[calledOrgId]] = mockShiftsService.updateShiftSymbolConfig.mock.calls;
      expect(calledOrgId).toBe(FAKE_USER.organization_id);
      expect(calledOrgId).not.toBe('other-org-id');
    });

    it('propagates BadRequestException from service', async () => {
      const { BadRequestException } = require('@nestjs/common');
      mockShiftsService.updateShiftSymbolConfig.mockRejectedValue(
        new BadRequestException('Failed to save symbol config'),
      );

      const dto: UpdateShiftSymbolConfigDto = { symbols: SAMPLE_SYMBOLS as any };
      await expect(controller.updateShiftSymbols(FAKE_USER, dto)).rejects.toThrow('Failed to save symbol config');
    });

    it('accepts an empty symbols array (clearing all custom symbols)', async () => {
      const saved = { id: 'row-2', organization_id: FAKE_USER.organization_id, symbols: [] };
      mockShiftsService.updateShiftSymbolConfig.mockResolvedValue(saved);

      const dto: UpdateShiftSymbolConfigDto = { symbols: [] as any };
      const result = await controller.updateShiftSymbols(FAKE_USER, dto);

      expect(result.symbols).toHaveLength(0);
    });
  });
});
