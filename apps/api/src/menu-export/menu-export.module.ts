import { Module } from '@nestjs/common';
import { MenuExportController } from './menu-export.controller';
import { MenuExportService } from './menu-export.service';
import { MenuImportService } from './menu-import.service';
import { MenuDocxService } from './menu-docx.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MenuExportController],
  providers: [MenuExportService, MenuImportService, MenuDocxService],
  exports: [MenuExportService, MenuImportService, MenuDocxService],
})
export class MenuExportModule {}
