import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Header,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { MenuScanService } from './menu-scan.service';
import { MenuScanConfirmDto, SaveDraftDto } from './dto/menu-scan-confirm.dto';
import { MenuSyncDto } from './dto/menu-scan-sync.dto';
import { MenuScanExtractResponse, MenuScanDraft } from './dto/menu-scan-response.dto';
import { RequirePermission } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

@ApiTags('menu-scan')
@Controller('menu-scan')
@UseGuards(StaffAuthGuard)
@ApiBearerAuth()
export class MenuScanController {
  constructor(private readonly menuScanService: MenuScanService) {}

  // ── OCR Extract ───────────────────────────────────────────────────────────

  @Post('extract')
  @UseGuards(ThrottlerGuard)
  @Throttle({ scan: { ttl: 60000, limit: 10 } })
  @RequirePermission('menus.create')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Handwritten menu image' },
        menu_group_id: { type: 'string', description: 'Target menu group ID' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Extract courses from handwritten menu image (auto-saves draft)' })
  async extractCourses(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MenuScanExtractResponse> {
    if (!file) throw new BadRequestException('Image file is required');
    const menuGroupId = req.body?.menu_group_id;
    return this.menuScanService.extractCourses(req.user.organization_id, file, menuGroupId);
  }

  // ── Draft CRUD ────────────────────────────────────────────────────────────

  @Get('drafts')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'List all menu scan drafts for this org' })
  async getDrafts(@Req() req: any): Promise<MenuScanDraft[]> {
    return this.menuScanService.getDrafts(req.user.organization_id);
  }

  @Post('drafts')
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'Save or update a menu scan draft' })
  async saveDraft(
    @Req() req: any,
    @Body() dto: SaveDraftDto,
  ): Promise<{ session_id: string }> {
    return this.menuScanService.saveDraft(req.user.organization_id, dto);
  }

  @Delete('drafts/:id')
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'Delete a menu scan draft' })
  async deleteDraft(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    return this.menuScanService.deleteDraft(req.user.organization_id, id);
  }

  // ── Sync: continuous save of the editing menu into relational rows ────────

  @Post('sync')
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'Sync the editing menu into menus + menu_dishes rows (diff-upsert)' })
  async syncMenu(@Req() req: any, @Body() dto: MenuSyncDto) {
    return this.menuScanService.syncMenu(req.user.organization_id, dto);
  }

  // ── Saved scanned menus (rows-backed; replaces draft list) ────────────────

  @Get('menus')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'List saved scanned menus (grouped by menu group)' })
  async getScannedMenus(@Req() req: any) {
    return this.menuScanService.getScannedMenus(req.user.organization_id);
  }

  @Get('menus/:groupId')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'Load one saved scanned menu (full courses + dishes) for editing' })
  async getScannedMenu(@Req() req: any, @Param('groupId') groupId: string) {
    return this.menuScanService.getScannedMenu(req.user.organization_id, groupId);
  }

  // ── Link a dish to a product (allergen source) ────────────────────────────

  @Patch('dishes/:id/product')
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'Link/unlink a scanned dish to a product (sets menu_dishes.product_id)' })
  async setDishProduct(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { product_id: string | null },
  ) {
    return this.menuScanService.setDishProduct(
      req.user.organization_id,
      id,
      body?.product_id ?? null,
    );
  }

  // ── Confirm (legacy alias to sync; kept for in-flight clients) ────────────

  @Post('confirm')
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'Legacy: confirm scanned menu (now an alias that writes rows)' })
  async confirmAndCreate(
    @Req() req: any,
    @Body() dto: MenuScanConfirmDto,
  ) {
    return this.menuScanService.confirmAndCreate(req.user.organization_id, dto);
  }
}
