import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';
import { TossPaymentsClient } from '../payments/toss-payments.client';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly toss: TossPaymentsClient,
  ) {}

  listPhotographers(status?: 'pending' | 'verified' | 'rejected') {
    return this.prisma.photographer.findMany({
      where: status ? { verificationStatus: status } : undefined,
      select: {
        id: true,
        businessName: true,
        representativeName: true,
        businessRegNo: true,
        verificationStatus: true,
        createdAt: true,
        user: { select: { name: true, phone: true, email: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listPayments(status?: 'pending' | 'completed' | 'cancelled' | 'expired' | 'failed') {
    return this.prisma.payment.findMany({
      where: status ? { status } : undefined,
      select: {
        id: true,
        bookingId: true,
        type: true,
        amount: true,
        status: true,
        paidAt: true,
        booking: {
          select: {
            customer: { select: { name: true } },
            photographer: { select: { businessName: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 100,
    });
  }

  listReviews(blinded?: boolean) {
    return this.prisma.review.findMany({
      where: blinded === undefined ? undefined : { isBlinded: blinded },
      select: {
        id: true,
        bookingId: true,
        ratingOverall: true,
        content: true,
        isBlinded: true,
        booking: {
          select: {
            customer: { select: { name: true } },
            photographer: { select: { businessName: true } },
          },
        },
      },
      take: 100,
    });
  }

  listDisputes(status?: 'open' | 'fact_check_requested' | 'resolved' | 'escalated') {
    return this.prisma.dispute.findMany({
      where: status
        ? { status }
        : { status: { in: ['open', 'fact_check_requested', 'escalated'] } },
      select: {
        id: true,
        bookingId: true,
        raisedBy: true,
        type: true,
        status: true,
        photographerResponseDueAt: true,
        resolution: true,
        resolvedAt: true,
        booking: {
          select: {
            customer: { select: { name: true } },
            photographer: { select: { businessName: true } },
          },
        },
      },
    });
  }

  async approvePhotographer(photographerId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    return this.prisma.photographer.update({
      where: { id: photographerId },
      data: { verificationStatus: 'verified' },
    });
  }

  async suspendPhotographer(photographerId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    await this.prisma.user.update({
      where: { id: photographer.userId },
      data: { status: 'suspended' },
    });
    return this.prisma.photographer.update({
      where: { id: photographerId },
      data: { verificationStatus: 'rejected' },
    });
  }

  async refundPayment(paymentId: string, dto: RefundPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }
    if (payment.status !== 'completed') {
      throw new BadRequestException('완료된 결제만 환불할 수 있습니다.');
    }
    if (dto.amount > payment.amount) {
      throw new BadRequestException('환불 금액이 결제 금액을 초과할 수 없습니다.');
    }

    const result = await this.toss.cancelPayment(
      payment.pgTransactionId ?? payment.id,
      dto.reason ?? '관리자 수동 환불',
      dto.amount,
    );

    // 환불은 원 결제 건을 수정하지 않고 별도 payments row(type='refund')로 기록 (대사 추적용)
    return this.prisma.payment.create({
      data: {
        bookingId: payment.bookingId,
        type: 'refund',
        amount: dto.amount,
        pgProvider: payment.pgProvider,
        pgTransactionId: payment.pgTransactionId,
        status: 'completed',
        paidAt: new Date(),
        webhookPayload: result.raw as Prisma.InputJsonValue,
      },
    });
  }

  async blindReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException('후기를 찾을 수 없습니다.');
    }
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isBlinded: true },
    });
  }

  async getDashboard() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      newCustomers,
      newPhotographers,
      pendingInquiries,
      activeDisputes,
      scheduledSettlements,
      monthlyPayments,
      monthlyPlatformRevenue,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: 'customer', createdAt: { gte: weekAgo } },
      }),
      this.prisma.user.count({
        where: { role: 'photographer', createdAt: { gte: weekAgo } },
      }),
      this.prisma.booking.count({ where: { status: 'inquiry' } }),
      this.prisma.dispute.count({
        where: { status: { in: ['open', 'fact_check_requested'] } },
      }),
      this.prisma.settlement.aggregate({
        where: { status: 'scheduled' },
        _sum: { totalAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'completed',
          type: { in: ['deposit', 'balance'] },
          paidAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.settlementItem.aggregate({
        where: { settlement: { periodStart: { gte: monthStart } } },
        _sum: { platformFee: true },
      }),
    ]);

    return {
      newCustomersThisWeek: newCustomers,
      newPhotographersThisWeek: newPhotographers,
      pendingInquiries,
      activeDisputes,
      scheduledSettlementTotal: scheduledSettlements._sum.totalAmount ?? 0,
      monthlyGrossRevenue: monthlyPayments._sum.amount ?? 0,
      monthlyPlatformRevenue: monthlyPlatformRevenue._sum.platformFee ?? 0,
    };
  }
}
