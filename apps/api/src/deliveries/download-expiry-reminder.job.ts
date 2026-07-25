import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DownloadExpiryReminderJob {
  private readonly logger = new Logger(DownloadExpiryReminderJob.name);

  constructor(private readonly prisma: PrismaService) {}

  // DB스키마_API명세.md 5장 "다운로드 만료 알림(-7일) / 자동 삭제 — 매일"
  // TODO: 알림 발송 벤더 연동 및 실제 스토리지 자동 삭제는 스토리지 벤더 확정 후 구현
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async remindDownloadExpiry() {
    const target = new Date();
    target.setDate(target.getDate() + 7);
    target.setHours(0, 0, 0, 0);
    const targetEnd = new Date(target.getTime() + 24 * 60 * 60 * 1000);

    const deliveries = await this.prisma.delivery.findMany({
      where: { downloadExpiresAt: { gte: target, lt: targetEnd } },
    });

    if (deliveries.length > 0) {
      this.logger.log(`다운로드 만료 7일 전 알림 대상 ${deliveries.length}건`);
    }
  }
}
