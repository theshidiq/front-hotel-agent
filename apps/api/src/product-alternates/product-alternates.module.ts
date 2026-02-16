import { Module } from '@nestjs/common';
import { ProductAlternatesController } from './product-alternates.controller';
import { ProductAlternatesService } from './product-alternates.service';

@Module({
  controllers: [ProductAlternatesController],
  providers: [ProductAlternatesService],
  exports: [ProductAlternatesService],
})
export class ProductAlternatesModule {}
