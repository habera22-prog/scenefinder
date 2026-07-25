import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const AUTO_CONFIRM_DAYS = 7;

@Injectable()
export class AutoConfirmDeliveryJob {
  private readonly logger = new Logger(AutoConfirmDeliveryJob.name);

  constructor(private readonly prisma: PrismaService) {}

  // DB스키마_API명세.md 5장 "납품 후 미확인 자동확인 처리(+7일) — 매일"
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoConfirmDeliveries() {
    const threshold = new Date(
      Date.now() - AUTO_CONFIRM_DAYS * 24 * 60 * 60 * 1000,
    );
    const pending = await this.prisma.delivery.findMany({
      where: { customerConfirmedAt: null, deliveredAt: { lte: threshold } },
    });

    for (const delivery of pending) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: delivery.bookingId },
      });
      if (!booking) continue;

      await this.prisma.delivery.update({
        where: { id: delivery.id },
        data: { customerConfirmedAt: new Date() },
      });
      await this.prisma.booking.update({
        where: { id: delivery.bookingId },
        data: { status: 'closed' },
      });
      await this.prisma.photographer.update({
        where: { id: booking.photographerId },
        data: { completedBookingsCount: { increment: 1 } },
      });
    }

    if (pending.length > 0) {
      this.logger.log(`납품 후 7일 미확인 ${pending.length}건 자동 확인 처리`);
    }
  }
}
