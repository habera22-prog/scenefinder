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
import { CreateRescheduleRequestDto } from './dto/create-reschedule-request.dto';
import { RespondRescheduleDto } from './dto/respond-reschedule.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractsService } from '../contracts/contracts.service';

const HOLD_DURATION_MS = 60 * 60 * 1000; // 견적확정 +1시간
const DEPOSIT_RATE = 0.3;
const BALANCE_DUE_DAYS_BEFORE = 3;

// 휴무일 비교는 한국 시간 기준 날짜로 — UTC 변환 시 날짜가 하루 밀리는 것을 방지
function kstDateOnly(date: Date): Date {
  const kstDateString = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(date);
  return new Date(kstDateString);
}

type BasicBooking = { customerId: string; photographerId: string };

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly contracts: ContractsService,
  ) {}

  async create(customerId: string, dto: CreateBookingDto) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: dto.photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }

    const shootDate = new Date(dto.shootDatetime);
    const blocked = await this.prisma.photographerAvailability.findUnique({
      where: {
        photographerId_date: {
          photographerId: dto.photographerId,
          date: kstDateOnly(shootDate),
        },
      },
    });
    if (blocked) {
      throw new BadRequestException(
        '작가가 해당 날짜에는 촬영이 불가능해요(휴무일). 다른 날짜를 선택해주세요.',
      );
    }

    // BUSINESS 전용 촬영(카테고리 businessOnly 또는 세금계산서 필요)은 사업자 작가에게만 배정 가능
    const shootCategory = await this.prisma.shootCategory.findUnique({
      where: { id: dto.shootCategoryId },
    });
    if (
      (shootCategory?.businessOnly || dto.taxInvoiceRequired) &&
      photographer.photographerType !== 'business'
    ) {
      throw new BadRequestException(
        '이 촬영은 사업자 인증 작가만 진행할 수 있어요. 다른 작가를 선택해주세요.',
      );
    }

    const booking = await this.prisma.booking.create({
      data: {
        customerId,
        photographerId: dto.photographerId,
        packageId: dto.packageId,
        shootCategoryId: dto.shootCategoryId,
        captureModeId: dto.captureModeId,
        shootDatetime: new Date(dto.shootDatetime),
        location: dto.location,
        headcount: dto.headcount,
        purpose: dto.purpose,
        requiredScenes: dto.requiredScenes as
          | Prisma.InputJsonValue
          | undefined,
        taxInvoiceRequired: dto.taxInvoiceRequired ?? false,
        status: 'inquiry',
        chatRoom: { create: {} },
      },
      include: { chatRoom: true },
    });

    await this.notifications.create(
      photographer.userId,
      'booking_created',
      '새 촬영 문의',
      `${dto.location}에서의 촬영 문의가 도착했어요.`,
      `/bookings/${booking.id}`,
    );

    return booking;
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

    await this.assertAboveMinHourlyRate(
      booking.shootCategoryId,
      booking.packageId,
      dto.totalAmount,
      dto.durationMin,
    );

    const depositAmount =
      dto.depositAmount ?? Math.round(dto.totalAmount * DEPOSIT_RATE);
    const balanceAmount = dto.totalAmount - depositAmount;

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'quoted',
        totalAmount: dto.totalAmount,
        depositAmount,
        balanceAmount,
        holdExpiresAt: new Date(Date.now() + HOLD_DURATION_MS),
      },
    });

    await this.notifications.create(
      booking.customerId,
      'quote_received',
      '견적이 도착했어요',
      `총 ${dto.totalAmount.toLocaleString()}원의 견적이 제시되었어요.`,
      `/bookings/${bookingId}`,
    );

    return updated;
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
        captureMode: true,
        package: true,
        deliveries: true,
        rescheduleRequests: { orderBy: { createdAt: 'desc' } },
        couponRedemption: { select: { couponId: true, discountAmount: true } },
        photographer: {
          select: {
            photographerType: true,
            businessName: true,
            representativeName: true,
            businessRegNo: true,
            activeRegions: true,
            user: { select: { name: true } },
          },
        },
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

  async requestReschedule(
    bookingId: string,
    userId: string,
    dto: CreateRescheduleRequestDto,
  ) {
    const booking = await this.findOrThrow(bookingId);
    const side = await this.resolveSide(booking, userId);

    if (!dto.newShootDatetime && !dto.newLocation) {
      throw new BadRequestException(
        '변경할 일시 또는 장소 중 하나는 입력해야 합니다.',
      );
    }

    const pending = await this.prisma.rescheduleRequest.findFirst({
      where: { bookingId, status: 'pending' },
    });
    if (pending) {
      throw new BadRequestException(
        '이미 응답을 기다리고 있는 일정 변경 요청이 있습니다.',
      );
    }

    const created = await this.prisma.rescheduleRequest.create({
      data: {
        bookingId,
        requestedBy: side,
        newShootDatetime: dto.newShootDatetime
          ? new Date(dto.newShootDatetime)
          : undefined,
        newLocation: dto.newLocation,
        reason: dto.reason,
      },
    });

    const recipientUserId = await this.otherPartyUserId(booking, side);
    await this.notifications.create(
      recipientUserId,
      'reschedule_requested',
      '일정 변경 요청',
      '상대방이 촬영 일정 변경을 요청했어요.',
      `/bookings/${bookingId}`,
    );

    return created;
  }

  async respondReschedule(
    bookingId: string,
    userId: string,
    dto: RespondRescheduleDto,
  ) {
    const booking = await this.findOrThrow(bookingId);
    const side = await this.resolveSide(booking, userId);

    const pending = await this.prisma.rescheduleRequest.findFirst({
      where: { bookingId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) {
      throw new NotFoundException('응답 대기중인 일정 변경 요청이 없습니다.');
    }
    if (pending.requestedBy === side) {
      throw new ForbiddenException(
        '요청을 보낸 당사자는 스스로 응답할 수 없습니다.',
      );
    }

    const requesterUserId = await this.otherPartyUserId(booking, side);

    if (!dto.approve) {
      const rejected = await this.prisma.rescheduleRequest.update({
        where: { id: pending.id },
        data: { status: 'rejected', respondedAt: new Date() },
      });
      await this.notifications.create(
        requesterUserId,
        'reschedule_responded',
        '일정 변경 거절됨',
        '요청한 일정 변경이 거절되었어요.',
        `/bookings/${bookingId}`,
      );
      return rejected;
    }

    const updated = await this.prisma.rescheduleRequest.update({
      where: { id: pending.id },
      data: { status: 'approved', respondedAt: new Date() },
    });
    await this.notifications.create(
      requesterUserId,
      'reschedule_responded',
      '일정 변경 승인됨',
      '요청한 일정 변경이 승인되었어요.',
      `/bookings/${bookingId}`,
    );

    const bookingUpdate: Prisma.BookingUpdateInput = {};
    if (pending.newShootDatetime) {
      bookingUpdate.shootDatetime = pending.newShootDatetime;
      if (booking.balanceDueAt) {
        bookingUpdate.balanceDueAt = new Date(
          pending.newShootDatetime.getTime() -
            BALANCE_DUE_DAYS_BEFORE * 24 * 60 * 60 * 1000,
        );
      }
    }
    if (pending.newLocation) {
      bookingUpdate.location = pending.newLocation;
    }
    if (Object.keys(bookingUpdate).length > 0) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: bookingUpdate,
      });

      // 이미 양측 서명이 끝난 계약서가 있다면 변경계약(새 버전)을 생성하고 재서명을 요구
      const newVersion = await this.contracts.createNewVersion(
        bookingId,
        '일정 변경으로 인한 재계약',
      );
      if (newVersion && newVersion.version > 1) {
        const photographerUserId = await this.otherPartyUserId(booking, 'customer');
        await Promise.all([
          this.notifications.create(
            booking.customerId,
            'reschedule_responded',
            '계약서가 갱신되었어요',
            '일정 변경으로 계약서가 새 버전으로 갱신되었어요. 다시 확인하고 서명해주세요.',
            `/bookings/${bookingId}`,
          ),
          this.notifications.create(
            photographerUserId,
            'reschedule_responded',
            '계약서가 갱신되었어요',
            '일정 변경으로 계약서가 새 버전으로 갱신되었어요. 다시 확인하고 서명해주세요.',
            `/bookings/${bookingId}`,
          ),
        ]);
      }
    }

    return updated;
  }

  // 카테고리별 시간당 최저가(관리자 설정) 미달 견적 차단 — 수수료 회피용 저가 신고 방지
  private async assertAboveMinHourlyRate(
    shootCategoryId: string,
    packageId: string | null,
    totalAmount: number,
    quoteDurationMin?: number,
  ) {
    const category = await this.prisma.shootCategory.findUnique({
      where: { id: shootCategoryId },
    });
    if (!category?.minHourlyRate) return;

    let durationMin = quoteDurationMin;
    if (!durationMin && packageId) {
      const pkg = await this.prisma.package.findUnique({
        where: { id: packageId },
      });
      durationMin = pkg?.durationMin;
    }
    if (!durationMin) {
      throw new BadRequestException(
        '상품 없이 맞춤 견적을 제시할 때는 촬영 시간(분)을 입력해야 합니다.',
      );
    }

    const minAmount = Math.ceil((category.minHourlyRate * durationMin) / 60);
    if (totalAmount < minAmount) {
      throw new BadRequestException(
        `이 분야("${category.label}")는 시간당 최저가 ${category.minHourlyRate.toLocaleString()}원이 적용돼요. ${durationMin}분 촬영이면 최소 ${minAmount.toLocaleString()}원 이상으로 견적을 제시해야 합니다.`,
      );
    }
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

  private async otherPartyUserId(
    booking: BasicBooking,
    side: 'customer' | 'photographer',
  ): Promise<string> {
    if (side === 'customer') {
      const photographer = await this.prisma.photographer.findUnique({
        where: { id: booking.photographerId },
      });
      return photographer!.userId;
    }
    return booking.customerId;
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
