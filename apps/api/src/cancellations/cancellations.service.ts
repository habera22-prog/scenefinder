import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';
import { AddActualCostsDto } from './dto/actual-costs.dto';
import { NotificationsService } from '../notifications/notifications.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const CUSTOMER_PENALTY_RATE = 0.1;
const PHOTOGRAPHER_COMPENSATION_RATE = 0.1;

// 서버 배포 타임존(주로 UTC)과 무관하게 "당일" 판정은 항상 한국 시간 기준이어야 함
function toKstDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
    date,
  );
}

type Side = 'customer' | 'photographer';

export interface CancellationOutcome {
  fault: Side;
  ruleApplied: string;
  refundAmount: number;
  compensationAmount: number | null;
  requiresAdminReview: boolean;
}

type BasicBooking = {
  id: string;
  customerId: string;
  photographerId: string;
  totalAmount: number | null;
  shootDatetime: Date | null;
  status: string;
};

@Injectable()
export class CancellationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async preview(bookingId: string, userId: string, initiatedBy: Side) {
    const booking = await this.loadBookingAndAssertSide(
      bookingId,
      userId,
      initiatedBy,
    );
    return this.computeOutcome(booking, initiatedBy);
  }

  async cancel(bookingId: string, userId: string, initiatedBy: Side) {
    const booking = await this.loadBookingAndAssertSide(
      bookingId,
      userId,
      initiatedBy,
    );
    if (['cancelled', 'closed', 'disputed'].includes(booking.status)) {
      throw new BadRequestException('이미 종료되었거나 취소된 예약입니다.');
    }

    const outcome = await this.computeOutcome(booking, initiatedBy);
    if (outcome.requiresAdminReview) {
      throw new BadRequestException(
        '촬영 개시 이후 취소·하자는 자동 산정이 불가합니다. 분쟁 접수를 이용해주세요.',
      );
    }

    const cancellation = await this.prisma.cancellation.create({
      data: {
        bookingId,
        initiatedBy,
        fault: outcome.fault,
        ruleApplied: outcome.ruleApplied,
        refundAmount: outcome.refundAmount,
        compensationAmount: outcome.compensationAmount ?? undefined,
      },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });

    const recipientUserId =
      initiatedBy === 'customer'
        ? (
            await this.prisma.photographer.findUnique({
              where: { id: booking.photographerId },
            })
          )?.userId
        : booking.customerId;
    if (recipientUserId) {
      await this.notifications.create(
        recipientUserId,
        'cancellation',
        '예약이 취소되었어요',
        outcome.ruleApplied,
        `/bookings/${bookingId}`,
      );
    }

    return cancellation;
  }

  async addActualCosts(
    bookingId: string,
    userId: string,
    dto: AddActualCostsDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: booking.photographerId },
    });
    if (photographer?.userId !== userId) {
      throw new ForbiddenException(
        '실비 증빙은 담당 작가만 첨부할 수 있습니다.',
      );
    }

    const cancellation = await this.prisma.cancellation.findFirst({
      where: { bookingId, fault: 'customer' },
      orderBy: { createdAt: 'desc' },
    });
    if (!cancellation) {
      throw new NotFoundException(
        '고객 귀책 취소 기록이 없어 실비를 반영할 수 없습니다.',
      );
    }

    const recognizedCosts = dto.items.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const refundAmount = Math.max(
      0,
      cancellation.refundAmount - recognizedCosts,
    );

    return this.prisma.cancellation.update({
      where: { id: cancellation.id },
      data: {
        actualCostItems: dto.items as unknown as Prisma.InputJsonValue,
        refundAmount,
      },
    });
  }

  private async computeOutcome(
    booking: BasicBooking,
    initiatedBy: Side,
  ): Promise<CancellationOutcome> {
    const paidAmount = await this.getPaidAmount(booking.id);
    const now = new Date();
    const shootDatetime = booking.shootDatetime;
    const hasShootStarted = !!shootDatetime && now >= shootDatetime;
    const isSameDay =
      !!shootDatetime &&
      !hasShootStarted &&
      toKstDateString(now) === toKstDateString(shootDatetime);
    const totalAmount = booking.totalAmount ?? 0;

    if (hasShootStarted) {
      return {
        fault: initiatedBy,
        ruleApplied: '촬영 개시 후 취소·하자 — 관리자 심사 필요',
        refundAmount: 0,
        compensationAmount: null,
        requiresAdminReview: true,
      };
    }

    if (initiatedBy === 'photographer') {
      return {
        fault: 'photographer',
        ruleApplied: isSameDay
          ? '촬영 당일 취소·노쇼 — 전액환불 + 총액 10% 보상, 대체 작가 우선 탐색 지원'
          : '촬영 개시 전 작가 취소 — 전액환불 + 총액 10% 보상',
        refundAmount: paidAmount,
        compensationAmount: Math.round(
          totalAmount * PHOTOGRAPHER_COMPENSATION_RATE,
        ),
        requiresAdminReview: false,
      };
    }

    // 고객 귀책
    if (paidAmount === 0) {
      return {
        fault: 'customer',
        ruleApplied: '결제 전(또는 작가 확정 전) 취소 — 전액 환불(결제 없음)',
        refundAmount: 0,
        compensationAmount: null,
        requiresAdminReview: false,
      };
    }

    const depositPaidAt = await this.getDepositPaidAt(booking.id);
    const within24hOfDeposit =
      !!depositPaidAt && now.getTime() - depositPaidAt.getTime() <= DAY_MS;
    const daysBeforeShoot = shootDatetime
      ? (shootDatetime.getTime() - now.getTime()) / DAY_MS
      : Infinity;

    if (within24hOfDeposit && daysBeforeShoot >= 7) {
      return {
        fault: 'customer',
        ruleApplied: '결제 후 24시간 이내 & D-7 이전 — 전액 환불',
        refundAmount: paidAmount,
        compensationAmount: null,
        requiresAdminReview: false,
      };
    }

    if (isSameDay) {
      return {
        fault: 'customer',
        ruleApplied:
          '당일 취소·노쇼 — 총 촬영금액 10% + 실비 부담(실비는 별도 첨부 필요)',
        refundAmount: Math.max(
          0,
          paidAmount - Math.round(totalAmount * CUSTOMER_PENALTY_RATE),
        ),
        compensationAmount: null,
        requiresAdminReview: false,
      };
    }

    return {
      fault: 'customer',
      ruleApplied: '촬영 개시 전(D-7 이후) — 총 촬영금액 10% 부담',
      refundAmount: Math.max(
        0,
        paidAmount - Math.round(totalAmount * CUSTOMER_PENALTY_RATE),
      ),
      compensationAmount: null,
      requiresAdminReview: false,
    };
  }

  private async getPaidAmount(bookingId: string): Promise<number> {
    const payments = await this.prisma.payment.findMany({
      where: {
        bookingId,
        status: 'completed',
        type: { in: ['deposit', 'balance'] },
      },
    });
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }

  private async getDepositPaidAt(bookingId: string): Promise<Date | null> {
    const deposit = await this.prisma.payment.findFirst({
      where: { bookingId, type: 'deposit', status: 'completed' },
    });
    return deposit?.paidAt ?? null;
  }

  private async loadBookingAndAssertSide(
    bookingId: string,
    userId: string,
    initiatedBy: Side,
  ): Promise<BasicBooking> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }

    if (initiatedBy === 'customer') {
      if (booking.customerId !== userId) {
        throw new ForbiddenException(
          '예약 당사자인 고객만 취소를 요청할 수 있습니다.',
        );
      }
    } else {
      const photographer = await this.prisma.photographer.findUnique({
        where: { id: booking.photographerId },
      });
      if (photographer?.userId !== userId) {
        throw new ForbiddenException('담당 작가만 취소를 요청할 수 있습니다.');
      }
    }

    return booking;
  }
}
