import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { QwenVisionService } from './qwen-vision.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // 60s timeout for vision API
    }),
  ],
  providers: [QwenVisionService],
  exports: [QwenVisionService],
})
export class QwenModule {}
