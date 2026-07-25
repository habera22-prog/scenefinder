import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { BookingStatus, Prisma } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { CreateConfirmationDto } from './dto/create-confirmation.dto';

const HOLD_DURATION_MS = 60 * 60 * 1000; // 견적확정 +1시간
const DEPOSIT_RATE = 0.3;
const BALANCE_DUE_DAYS_BEFORE = 3;

type BasicBooking = { customerId: string; photographerId: string };

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateBookingDto) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: dto.photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }

    return this.prisma.booking.create({
      data: {
        customerId,
        photographerId: dto.photographerId,
        packageId: dto.packageId,
        shootCategoryId: dto.shootCategoryId,
        shootDatetime: new Date(dto.shootDatetime),
        location: dto.location,
        headcount: dto.headcount,
        purpose: dto.purpose,
        requiredScenes: dto.requiredScenes as
          | Prisma.InputJsonValue
          | undefined,
        status: 'inquiry',
        chatRoom: { create: {} },
      },
      include: { chatRoom: true },
    });
  }

  async quote(bookingId: string, userId: string, dto: CreateQuoteDto) {
    const booking = await this.findOrThrow(bookingId);
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: booking.photographerId },
    });
    if (!photographer || photographer.userId !== userId) {
      throw new ForbiddenException(
        '해당 예약의 담당 작가만 견적을 제시할 수 있습니다.',
      );
    }
    if (booking.status !== 'inquiry') {
      throw new BadRequestException(
        '문의 상태의 예약만 견적을 제시할 수 있습니다.',
      );
    }

    const depositAmount =
      dto.depositAmount ?? Math.round(dto.totalAmount * DEPOSIT_RATE);
    const balanceAmount = dto.totalAmount - depositAmount;

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'quoted',
        totalAmount: dto.totalAmount,
        depositAmount,
        balanceAmount,
        holdExpiresAt: new Date(Date.now() + HOLD_DURATION_MS),
      },
    });
  }

  async acceptQuote(bookingId: string, userId: string) {
    const booking = await this.findOrThrow(bookingId);
    if (booking.customerId !== userId) {
      throw new ForbiddenException(
        '예약 당사자인 고객만 견적을 수락할 수 있습니다.',
      );
    }
    if (booking.status !== 'quoted') {
      throw new BadRequestException(
        '견적 제시 상태의 예약만 수락할 수 있습니다.',
      );
    }
    if (!booking.holdExpiresAt || booking.holdExpiresAt < new Date()) {
      throw new BadRequestException(
        '슬롯 홀드가 만료되었습니다. 작가에게 견적을 다시 요청해주세요.',
      );
    }

    const balanceDueAt = booking.shootDatetime
      ? new Date(
          booking.shootDatetime.getTime() -
            BALANCE_DUE_DAYS_BEFORE * 24 * 60 * 60 * 1000,
        )
      : undefined;

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'held', balanceDueAt },
    });
  }

  async findById(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        confirmations: true,
        chatRoom: true,
        shootCategory: true,
        package: true,
        deliveries: true,
      },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    await this.resolveSide(booking, userId);
    return booking;
  }

  async list(userId: string, query: ListBookingsQueryDto) {
    const where: Prisma.BookingWhereInput = {};

    if (query.role === 'customer') {
      where.customerId = userId;
    } else {
      const photographer = await this.prisma.photographer.findUnique({
        where: { userId },
      });
      if (!photographer) return [];
      where.photographerId = photographer.id;
    }

    if (query.status) {
      where.status = query.status as BookingStatus;
    }

    return this.prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async addConfirmation(
    bookingId: string,
    userId: string,
    dto: CreateConfirmationDto,
  ) {
    const booking = await this.findOrThrow(bookingId);
    const side = await this.resolveSide(booking, userId);

    const existing = await this.prisma.bookingConfirmation.findFirst({
      where: { bookingId, field: dto.field },
    });

    if (existing) {
      return this.prisma.bookingConfirmation.update({
        where: { id: existing.id },
        data:
          side === 'customer'
            ? { value: dto.value, confirmedByCustomerAt: new Date() }
            : { value: dto.value, confirmedByPhotographerAt: new Date() },
      });
    }

    return this.prisma.bookingConfirmation.create({
      data:
        side === 'customer'
          ? {
              bookingId,
              field: dto.field,
              value: dto.value,
              confirmedByCustomerAt: new Date(),
            }
          : {
              bookingId,
              field: dto.field,
              value: dto.value,
              confirmedByPhotographerAt: new Date(),
            },
    });
  }

  private async findOrThrow(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    return booking;
  }

  private async resolveSide(
    booking: BasicBooking,
    userId: string,
  ): Promise<'customer' | 'photographer'> {
    if (booking.customerId === userId) return 'customer';
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: booking.photographerId },
    });
    if (photographer?.userId === userId) return 'photographer';
    throw new ForbiddenException('예약 당사자만 접근할 수 있습니다.');
  }
}
