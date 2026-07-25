import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BalanceDueReminderJob {
  private readonly logger = new Logger(BalanceDueReminderJob.name);

  constructor(private readonly prisma: PrismaService) {}

  // DB스키마_API명세.md 5장 "잔금 미결제 알림(D-3) — 매일"
  // TODO: 이메일/SMS 벤더 연동 전까지 로그로 대체
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async remindBalanceDue() {
    const target = new Date();
    target.setDate(target.getDate() + 3);
    target.setHours(0, 0, 0, 0);
    const targetEnd = new Date(target.getTime() + 24 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'deposit_paid',
        balanceDueAt: { gte: target, lt: targetEnd },
      },
    });

    if (bookings.length > 0) {
      this.logger.log(
        `잔금 결제 D-3 알림 대상 ${bookings.length}건: ${bookings
          .map((b) => b.id)
          .join(', ')}`,
      );
    }
  }
}
