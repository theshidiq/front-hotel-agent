import { Module } from '@nestjs/common';
import { SeasonalMenusController } from './seasonal-menus.controller';
import { SeasonalMenusService } from './seasonal-menus.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SeasonalMenusController],
  providers: [SeasonalMenusService],
  exports: [SeasonalMenusService],
})
export class SeasonalMenusModule {}
