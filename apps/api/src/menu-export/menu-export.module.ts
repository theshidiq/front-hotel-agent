import { Module } from '@nestjs/common';
import { MenuExportController } from './menu-export.controller';
import { MenuExportService } from './menu-export.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MenuExportController],
  providers: [MenuExportService],
  exports: [MenuExportService],
})
export class MenuExportModule {}
