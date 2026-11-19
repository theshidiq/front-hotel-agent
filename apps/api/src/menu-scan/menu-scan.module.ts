import { Module } from '@nestjs/common';
import { MenuScanController } from './menu-scan.controller';
import { MenuScanService } from './menu-scan.service';
import { GeminiVisionService } from './gemini-vision.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MenuScanController],
  providers: [MenuScanService, GeminiVisionService],
})
export class MenuScanModule {}
