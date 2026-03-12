import { Module } from '@nestjs/common';
import { ProductAlternatesController } from './product-alternates.controller';
import { ProductAlternatesService } from './product-alternates.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProductAlternatesController],
  providers: [ProductAlternatesService],
  exports: [ProductAlternatesService],
})
export class ProductAlternatesModule {}
