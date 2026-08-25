import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { BookingStatus, Prisma } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';
import { TossPaymentsClient } from '../payments/toss-payments.client';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { CreateShootCategoryDto } from './dto/create-shoot-category.dto';
import { UpdateShootCategoryDto } from './dto/update-shoot-category.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { NotificationsService } from '../notifications/notifications.service';
import type { UserRole, UserStatus } from '@scenefinder/database';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly toss: TossPaymentsClient,
    private readonly notifications: NotificationsService,
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

  listSupportTickets(status?: 'open' | 'answered' | 'closed') {
    return this.prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      include: { user: { select: { name: true, phone: true, role: true } } },
      orderBy: [{ isEmergency: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async respondToTicket(ticketId: string, response: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException('문의를 찾을 수 없습니다.');
    }
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { adminResponse: response, status: 'answered', respondedAt: new Date() },
    });
    await this.notifications.create(
      ticket.userId,
      'support_answered',
      '문의에 답변이 등록되었어요',
      response,
      '/me/support',
    );
    return updated;
  }

  listAllShootCategories() {
    return this.prisma.shootCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createShootCategory(dto: CreateShootCategoryDto) {
    const existing = await this.prisma.shootCategory.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('이미 존재하는 code입니다.');
    }
    return this.prisma.shootCategory.create({
      data: {
        code: dto.code,
        label: dto.label,
        sortOrder: dto.sortOrder ?? 0,
        minHourlyRate: dto.minHourlyRate,
      },
    });
  }

  async updateShootCategory(id: string, dto: UpdateShootCategoryDto) {
    const category = await this.prisma.shootCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }
    return this.prisma.shootCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deletePortfolio(portfolioId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });
    if (!portfolio) {
      throw new NotFoundException('포트폴리오를 찾을 수 없습니다.');
    }
    await this.prisma.portfolio.delete({ where: { id: portfolioId } });
    return { id: portfolioId, deleted: true };
  }

  async deletePackage(packageId: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) {
      throw new NotFoundException('촬영 상품을 찾을 수 없습니다.');
    }
    const bookingCount = await this.prisma.booking.count({
      where: { packageId },
    });
    if (bookingCount > 0) {
      throw new BadRequestException(
        '이미 예약에 사용된 상품은 삭제할 수 없습니다. 비활성화가 필요하면 작가에게 안내해주세요.',
      );
    }
    await this.prisma.package.delete({ where: { id: packageId } });
    return { id: packageId, deleted: true };
  }

  listCoupons() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoupon(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('이미 존재하는 쿠폰 코드입니다.');
    }
    return this.prisma.coupon.create({
      data: {
        code: dto.code,
        name: dto.name,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscountAmount: dto.maxDiscountAmount,
        minOrderAmount: dto.minOrderAmount,
        maxRedemptions: dto.maxRedemptions,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async deactivateCoupon(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('쿠폰을 찾을 수 없습니다.');
    }
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async exportPaymentsCsv(from?: string, to?: string) {
    const paidAt: { gte?: Date; lte?: Date } = {};
    if (from) paidAt.gte = new Date(`${from}T00:00:00+09:00`);
    if (to) paidAt.lte = new Date(`${to}T23:59:59+09:00`);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'completed',
        ...(from || to ? { paidAt } : {}),
      },
      select: {
        id: true,
        type: true,
        amount: true,
        pgProvider: true,
        paidAt: true,
        booking: {
          select: {
            id: true,
            customer: { select: { name: true } },
            photographer: { select: { businessName: true } },
          },
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    const header = [
      '결제ID',
      '예약ID',
      '고객명',
      '작가상호',
      '결제유형',
      '금액',
      'PG사',
      '결제일시',
    ];
    const rows = payments.map((p) => [
      p.id,
      p.booking.id,
      p.booking.customer.name,
      p.booking.photographer.businessName,
      p.type,
      String(p.amount),
      p.pgProvider,
      p.paidAt ? p.paidAt.toISOString() : '',
    ]);

    const escapeCsv = (value: string) =>
      /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

    return [header, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');
  }

  listBookings(status?: BookingStatus, photographerId?: string) {
    return this.prisma.booking.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(photographerId ? { photographerId } : {}),
      },
      select: {
        id: true,
        status: true,
        shootDatetime: true,
        location: true,
        totalAmount: true,
        createdAt: true,
        customer: { select: { name: true, phone: true } },
        photographer: { select: { businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getBookingDetail(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        photographer: {
          select: { businessName: true, representativeName: true, businessRegNo: true },
        },
        shootCategory: true,
        package: true,
        confirmations: true,
        payments: true,
        cancellations: true,
        disputes: true,
        deliveries: true,
        rescheduleRequests: { orderBy: { createdAt: 'desc' } },
        review: true,
        chatRoom: { include: { messages: { orderBy: { createdAt: 'asc' } } } },
      },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    return booking;
  }

  async updateBooking(bookingId: string, dto: UpdateBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        ...(dto.shootDatetime ? { shootDatetime: new Date(dto.shootDatetime) } : {}),
        ...(dto.location ? { location: dto.location } : {}),
        ...(dto.headcount ? { headcount: dto.headcount } : {}),
        ...(dto.purpose ? { purpose: dto.purpose } : {}),
      },
    });
  }

  listUsers(role?: UserRole, status?: UserStatus) {
    return this.prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async setUserStatus(userId: string, status: 'active' | 'suspended') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    if (user.role === 'admin') {
      throw new BadRequestException('관리자 계정은 상태를 변경할 수 없습니다.');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
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
