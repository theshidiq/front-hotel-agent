import { Module } from '@nestjs/common';
import { SeasonalMenusController } from './seasonal-menus.controller';
import { SeasonalMenusService } from './seasonal-menus.service';

@Module({
  controllers: [SeasonalMenusController],
  providers: [SeasonalMenusService],
  exports: [SeasonalMenusService],
})
export class SeasonalMenusModule {}
