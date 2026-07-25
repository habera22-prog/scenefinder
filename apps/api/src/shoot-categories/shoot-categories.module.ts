import { Module } from '@nestjs/common';
import { ShootCategoriesController } from './shoot-categories.controller';

@Module({
  controllers: [ShootCategoriesController],
})
export class ShootCategoriesModule {}
