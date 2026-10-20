import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, PaymentStatus } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';
import { TossPaymentsClient } from './toss-payments.client';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { NotificationsService } from '../notifications/notifications.service';

type BasicBooking = { customerId: string; photographerId: string };

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly toss: TossPaymentsClient,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async requestDeposit(bookingId: string, userId: string) {
    const booking = await this.getBookingForCustomer(bookingId, userId);
    if (booking.status !== 'held') {
      throw new BadRequestException(
        '예약금 결제는 견적 수락(held) 상태에서만 가능합니다.',
      );
    }
    if (!booking.depositAmount) {
      throw new BadRequestException('예약금 금액이 산정되지 않았습니다.');
    }
    return this.createPendingPayment(booking.id, 'deposit', booking.depositAmount);
  }

  async requestBalance(bookingId: string, userId: string) {
    const booking = await this.getBookingForCustomer(bookingId, userId);
    if (booking.status !== 'deposit_paid') {
      throw new BadRequestException(
        '잔금 결제는 예약금 결제 완료 상태에서만 가능합니다.',
      );
    }
    if (!booking.balanceAmount) {
      throw new BadRequestException('잔금 금액이 산정되지 않았습니다.');
    }
    return this.createPendingPayment(booking.id, 'balance', booking.balanceAmount);
  }

  private async createPendingPayment(
    bookingId: string,
    type: 'deposit' | 'balance',
    amount: number,
  ) {
    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        type,
        amount,
        pgProvider: 'tosspayments',
        status: 'pending',
      },
    });

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    return {
      paymentId: payment.id,
      orderId: payment.id,
      amount,
      orderName:
        type === 'deposit' ? '씬파인더 예약금 결제' : '씬파인더 잔금 결제',
      successUrl: `${frontendUrl}/bookings/${bookingId}/payments/${payment.id}/success`,
      failUrl: `${frontendUrl}/bookings/${bookingId}/payments/${payment.id}/fail`,
    };
  }

  async confirm(paymentId: string, userId: string, dto: ConfirmPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });
    if (!payment) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }
    if (payment.booking.customerId !== userId) {
      throw new ForbiddenException('본인 예약의 결제만 승인할 수 있습니다.');
    }
    if (payment.status === 'completed') {
      return payment;
    }
    if (dto.orderId !== payment.id || dto.amount !== payment.amount) {
      throw new BadRequestException('결제 정보가 일치하지 않습니다.');
    }

    const result = await this.toss.confirmPayment(
      dto.paymentKey,
      dto.orderId,
      dto.amount,
    );

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        paidAt: new Date(),
        pgTransactionId: result.paymentKey,
        webhookPayload: result.raw as Prisma.InputJsonValue,
      },
    });

    const nextStatus = payment.type === 'deposit' ? 'deposit_paid' : 'confirmed';
    await this.prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: nextStatus },
    });

    if (payment.type === 'deposit') {
      await this.prisma.chatRoom.update({
        where: { bookingId: payment.bookingId },
        data: { contactDisclosed: true },
      });
    }

    const photographer = await this.prisma.photographer.findUnique({
      where: { id: payment.booking.photographerId },
    });
    if (photographer) {
      await this.notifications.create(
        photographer.userId,
        'payment_completed',
        payment.type === 'deposit' ? '예약금 결제 완료' : '잔금 결제 완료',
        `${payment.amount.toLocaleString()}원이 결제되었어요.`,
        `/bookings/${payment.bookingId}?role=photographer`,
      );
    }

    return updatedPayment;
  }

  async handleWebhook(payload: Record<string, unknown>) {
    // TODO: 프로덕션 전환 시 토스페이먼츠 웹훅 서명/출처 검증 추가 필요
    const data = (payload.data as Record<string, unknown>) ?? payload;
    const paymentKey = data.paymentKey as string | undefined;
    const orderId = data.orderId as string | undefined;
    const status = data.status as string | undefined;

    if (!orderId) {
      return { received: true };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: orderId },
    });
    if (!payment) {
      return { received: true };
    }

    await this.prisma.payment.update({
      where: { id: orderId },
      data: {
        status: this.mapTossStatus(status),
        pgTransactionId: paymentKey ?? payment.pgTransactionId,
        webhookPayload: payload as Prisma.InputJsonValue,
      },
    });

    return { received: true };
  }

  private mapTossStatus(status?: string): PaymentStatus {
    switch (status) {
      case 'DONE':
        return 'completed';
      case 'CANCELED':
      case 'PARTIAL_CANCELED':
        return 'cancelled';
      case 'EXPIRED':
        return 'expired';
      default:
        return 'pending';
    }
  }

  async listForBooking(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    await this.assertParticipant(booking, userId);
    return this.prisma.payment.findMany({
      where: { bookingId },
      orderBy: { paidAt: 'asc' },
    });
  }

  private async getBookingForCustomer(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    if (booking.customerId !== userId) {
      throw new ForbiddenException('예약 당사자인 고객만 결제할 수 있습니다.');
    }
    return booking;
  }

  private async assertParticipant(booking: BasicBooking, userId: string) {
    if (booking.customerId === userId) return;
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: booking.photographerId },
    });
    if (photographer?.userId === userId) return;
    throw new ForbiddenException('예약 당사자만 접근할 수 있습니다.');
  }
}
