import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { QwenModule } from '../qwen/qwen.module';
import { AllergensModule } from '../allergens/allergens.module';

@Module({
  imports: [QwenModule, AllergensModule],
  controllers: [ScanController],
  providers: [ScanService],
})
export class ScanModule {}
