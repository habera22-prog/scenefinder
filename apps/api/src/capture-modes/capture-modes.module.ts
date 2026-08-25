import { Module } from '@nestjs/common';
import { CaptureModesController } from './capture-modes.controller';

@Module({
  controllers: [CaptureModesController],
})
export class CaptureModesModule {}
