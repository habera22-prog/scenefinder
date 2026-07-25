import { Module } from '@nestjs/common';
import { PhotographersController } from './photographers.controller';
import { PhotographersService } from './photographers.service';

@Module({
  controllers: [PhotographersController],
  providers: [PhotographersService],
})
export class PhotographersModule {}
