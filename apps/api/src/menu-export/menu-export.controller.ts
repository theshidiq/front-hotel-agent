import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  Header,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MenuExportService } from './menu-export.service';
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
  constructor(private readonly menuExportService: MenuExportService) {}

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
