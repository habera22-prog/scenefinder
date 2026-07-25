import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';

type SettlementWithItems = Prisma.SettlementGetPayload<{
  include: { items: true };
}>;

const NEW_PHOTOGRAPHER_HOLD_DAYS = 7;
const STANDARD_HOLD_BUSINESS_DAYS = 3;
const NEW_PHOTOGRAPHER_FREE_BOOKINGS = 3;

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7; // 월요일 시작
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

interface SettlementItemDraft {
  bookingId: string;
  grossAmount: number;
  platformFee: number;
  pgFee: number;
  deductionAmount: number;
  netAmount: number;
}

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);
  private readonly platformFeeRate: number;
  private readonly pgFeeRate: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.platformFeeRate = Number(
      this.config.get('SETTLEMENT_FEE_RATE', '0.15'),
    );
    this.pgFeeRate = Number(this.config.get('PG_FEE_RATE', '0.033'));
  }

  // DB스키마_API명세.md 5장 "주간 정산 실행 — 주 1회"
  // 정산 대상: status='closed' (분쟁 중인 건은 status='disputed'라 자연히 제외됨)
  // 정산 시점: 신규 작가 첫 3건은 촬영완료(근사치: 최종 상태전이 시각) +7일, 그 외는 +3영업일
  async runWeekly() {
    const now = new Date();
    const closedBookings = await this.prisma.booking.findMany({
      where: { status: 'closed', settlementItem: null },
      include: { photographer: true },
    });

    const settledCountCache = new Map<string, number>();
    const photographerItems = new Map<string, SettlementItemDraft[]>();
    let skipped = 0;

    for (const booking of closedBookings) {
      const photographer = booking.photographer;
      let settledCount = settledCountCache.get(photographer.id);
      if (settledCount === undefined) {
        settledCount = await this.prisma.settlementItem.count({
          where: { booking: { photographerId: photographer.id } },
        });
        settledCountCache.set(photographer.id, settledCount);
      }

      const isNewPhotographerBooking =
        photographer.isNewPhotographer &&
        settledCount < NEW_PHOTOGRAPHER_FREE_BOOKINGS;

      const eligibleAt = isNewPhotographerBooking
        ? new Date(
            booking.updatedAt.getTime() +
              NEW_PHOTOGRAPHER_HOLD_DAYS * 24 * 60 * 60 * 1000,
          )
        : addBusinessDays(booking.updatedAt, STANDARD_HOLD_BUSINESS_DAYS);

      if (eligibleAt > now) {
        skipped++;
        continue;
      }

      const grossAmount = booking.totalAmount ?? 0;
      const platformFee = Math.round(grossAmount * this.platformFeeRate);
      const pgFee = Math.round(grossAmount * this.pgFeeRate);
      const deductionAmount = 0;
      const netAmount = grossAmount - platformFee - pgFee - deductionAmount;

      const items = photographerItems.get(photographer.id) ?? [];
      items.push({
        bookingId: booking.id,
        grossAmount,
        platformFee,
        pgFee,
        deductionAmount,
        netAmount,
      });
      photographerItems.set(photographer.id, items);
      settledCountCache.set(photographer.id, settledCount + 1);
    }

    const periodStart = startOfWeek(now);
    const periodEnd = new Date(periodStart.getTime() + 6 * 24 * 60 * 60 * 1000);

    const settlements: SettlementWithItems[] = [];
    for (const [photographerId, items] of photographerItems) {
      if (items.length === 0) continue;
      const totalAmount = items.reduce((sum, i) => sum + i.netAmount, 0);

      const settlement = await this.prisma.settlement.create({
        data: {
          photographerId,
          periodStart,
          periodEnd,
          status: 'scheduled',
          totalAmount,
          items: { create: items },
        },
        include: { items: true },
      });
      settlements.push(settlement);

      const totalSettledNow = settledCountCache.get(photographerId) ?? 0;
      const photographer = await this.prisma.photographer.findUnique({
        where: { id: photographerId },
      });
      if (
        photographer?.isNewPhotographer &&
        totalSettledNow >= NEW_PHOTOGRAPHER_FREE_BOOKINGS
      ) {
        await this.prisma.photographer.update({
          where: { id: photographerId },
          data: { isNewPhotographer: false },
        });
      }
    }

    const itemsCreated = settlements.reduce((sum, s) => sum + s.items.length, 0);
    this.logger.log(
      `주간 정산 실행: ${settlements.length}명 작가, ${itemsCreated}건 정산 항목 생성 (보류 ${skipped}건)`,
    );
    return { settlementsCreated: settlements.length, itemsCreated, skipped, settlements };
  }

  async listForPhotographer(photographerId: string, userId: string) {
    await this.assertOwner(photographerId, userId);
    return this.prisma.settlement.findMany({
      where: { photographerId },
      orderBy: { periodStart: 'desc' },
    });
  }

  async getItems(
    photographerId: string,
    settlementId: string,
    userId: string,
  ) {
    await this.assertOwner(photographerId, userId);
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
    });
    if (!settlement || settlement.photographerId !== photographerId) {
      throw new NotFoundException('정산 내역을 찾을 수 없습니다.');
    }
    return this.prisma.settlementItem.findMany({ where: { settlementId } });
  }

  private async assertOwner(photographerId: string, userId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    if (photographer.userId !== userId) {
      throw new ForbiddenException('본인 정산 내역만 조회할 수 있습니다.');
    }
  }
}
