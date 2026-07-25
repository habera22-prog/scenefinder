import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { WeeklySettlementJob } from './weekly-settlement.job';

@Module({
  controllers: [SettlementsController],
  providers: [SettlementsService, WeeklySettlementJob],
})
export class SettlementsModule {}
