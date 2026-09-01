import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  Header,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MenuExportService } from './menu-export.service';
import { MenuImportService } from './menu-import.service';
import { RequirePermission } from '../auth/permission.decorator';
import { StaffAuthGuard } from '../auth/auth.guard';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Menu → Excel archive endpoints.
 *
 * READ-ONLY by design: this controller never mutates menu data. It exists so the
 * menus can outlive the application — an .xlsx anyone can open in Excel, Sheets,
 * or LibreOffice with no database and no developer.
 */
@ApiTags('menu-export')
@Controller('menu-export')
@UseGuards(StaffAuthGuard)
@ApiBearerAuth()
export class MenuExportController {
  constructor(
    private readonly menuExportService: MenuExportService,
    private readonly menuImportService: MenuImportService,
  ) {}

  @Get('menus.xlsx')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'Export ALL menus as one .xlsx archive (layout + data sheets)' })
  async exportAll(@Req() req: any, @Res() res: Response) {
    const { buffer, filename } = await this.menuExportService.exportAll(
      req.user.organization_id,
    );
    this.send(res, buffer, filename);
  }

  @Get('menus/:groupId.xlsx')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('menus.create')
  @ApiOperation({ summary: 'Export one menu group as .xlsx (layout + data sheets)' })
  async exportOne(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.menuExportService.exportMenu(
      req.user.organization_id,
      groupId,
    );
    this.send(res, buffer, filename);
  }

  // ── Import (round-trip): two-phase, never writes without confirmation ──────

  @Post('preview')
  @RequirePermission('menus.create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Phase 1: diff an edited export against the DB. Read-only — writes nothing.',
  })
  async previewImport(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('An .xlsx file is required');
    return this.menuImportService.preview(req.user.organization_id, file.buffer);
  }

  @Post('apply')
  @RequirePermission('menus.create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        token: { type: 'string', description: 'Token from the matching preview' },
        allow_deletes: { type: 'string', description: 'Pass "true" to also remove dishes absent from the sheet' },
      },
      required: ['file', 'token'],
    },
  })
  @ApiOperation({
    summary: 'Phase 2: apply an import, but only the exact change set that was previewed',
  })
  async applyImport(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { token?: string; allow_deletes?: string | boolean },
  ) {
    if (!file) throw new BadRequestException('An .xlsx file is required');
    if (!body?.token) {
      throw new BadRequestException('A preview token is required — preview the file first.');
    }
    // Deletions must be opted into explicitly, separately from the token.
    const allowDeletes = body.allow_deletes === true || body.allow_deletes === 'true';
    return this.menuImportService.apply(
      req.user.organization_id,
      file.buffer,
      body.token,
      allowDeletes,
    );
  }

  /**
   * Write the workbook. The filename is sent twice: a plain ASCII `filename` for
   * older clients and RFC 5987 `filename*` so Japanese menu titles survive.
   */
  private send(res: Response, buffer: Buffer, filename: string) {
    const stamp = new Date().toISOString().slice(0, 10);
    const full = `${filename}-${stamp}.xlsx`;
    const ascii = full.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(full)}`,
    );
    res.end(buffer);
  }
}
