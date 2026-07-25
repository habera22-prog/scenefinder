import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HoldExpiryJob {
  private readonly logger = new Logger(HoldExpiryJob.name);

  constructor(private readonly prisma: PrismaService) {}

  // DB스키마_API명세.md 5장 "슬롯 홀드 만료 해제 — 1분마다"
  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredHolds() {
    const result = await this.prisma.booking.updateMany({
      where: {
        status: { in: ['quoted', 'held'] },
        holdExpiresAt: { lt: new Date() },
      },
      data: { status: 'cancelled' },
    });
    if (result.count > 0) {
      this.logger.log(`슬롯 홀드 만료로 ${result.count}건 자동 취소 처리`);
    }
  }
}
