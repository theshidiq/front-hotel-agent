import { Module } from '@nestjs/common';
import { MenuScanController } from './menu-scan.controller';
import { MenuScanService } from './menu-scan.service';
import { ClaudeVisionService } from './claude-vision.service';
import { GeminiVisionService } from './gemini-vision.service';
import { MenusModule } from '../menus/menus.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MenusModule, // provides MenusService (already exported)
  ],
  controllers: [MenuScanController],
  providers: [MenuScanService, ClaudeVisionService, GeminiVisionService],
})
export class MenuScanModule {}
