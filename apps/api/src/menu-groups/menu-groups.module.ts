import { Module } from '@nestjs/common';
import { MenuGroupsController } from './menu-groups.controller';
import { MenuGroupsService } from './menu-groups.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MenuGroupsController],
  providers: [MenuGroupsService],
  exports: [MenuGroupsService],
})
export class MenuGroupsModule {}
