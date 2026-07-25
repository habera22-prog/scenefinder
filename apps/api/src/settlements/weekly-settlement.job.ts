import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SettlementsService } from './settlements.service';

@Injectable()
export class WeeklySettlementJob {
  constructor(private readonly settlementsService: SettlementsService) {}

  // DB스키마_API명세.md 5장 "주간 정산 실행 — 주 1회(요일 지정)" — 매주 월요일 03:00
  @Cron('0 3 * * 1')
  async run() {
    await this.settlementsService.runWeekly();
  }
}
