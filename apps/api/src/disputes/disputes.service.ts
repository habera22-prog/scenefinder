import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { NotificationsService } from '../notifications/notifications.service';

const FACT_CHECK_SLA_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(bookingId: string, userId: string, dto: CreateDisputeDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }

    const raisedBy = await this.resolveSide(booking, userId);

    const dispute = await this.prisma.dispute.create({
      data: { bookingId, raisedBy, type: dto.type, status: 'open' },
    });

    // 분쟁 접수 시 해당 예약 정산 보류 (settlements 모듈에서 status='disputed' 건 제외 처리)
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'disputed' },
    });

    const photographer = await this.prisma.photographer.findUnique({
      where: { id: booking.photographerId },
    });
    const otherPartyUserId =
      raisedBy === 'customer' ? photographer?.userId : booking.customerId;
    if (otherPartyUserId) {
      await this.notifications.create(
        otherPartyUserId,
        'dispute_filed',
        '분쟁이 접수되었어요',
        `${dto.type} 관련 분쟁이 접수되었어요.`,
        `/bookings/${bookingId}?role=${raisedBy === 'customer' ? 'photographer' : 'customer'}`,
      );
    }

    const admins = await this.prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifications.create(
          admin.id,
          'dispute_filed',
          '새 분쟁 접수',
          `예약 ${bookingId}에 분쟁이 접수되었어요.`,
          `/admin/bookings/${bookingId}`,
        ),
      ),
    );

    return dispute;
  }

  async listForBooking(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    await this.resolveSide(booking, userId);

    return this.prisma.dispute.findMany({
      where: { bookingId },
    });
  }

  async requestFactCheck(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });
    if (!dispute) {
      throw new NotFoundException('분쟁 정보를 찾을 수 없습니다.');
    }
    if (dispute.status === 'resolved') {
      throw new BadRequestException('이미 종료된 분쟁입니다.');
    }

    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'fact_check_requested',
        photographerResponseDueAt: new Date(Date.now() + FACT_CHECK_SLA_MS),
      },
    });
  }

  async resolve(disputeId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });
    if (!dispute) {
      throw new NotFoundException('분쟁 정보를 찾을 수 없습니다.');
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'resolved',
        resolution: dto.resolution,
        resolvedAt: new Date(),
      },
    });

    const booking = await this.prisma.booking.findUnique({
      where: { id: dispute.bookingId },
    });
    if (booking) {
      const photographer = await this.prisma.photographer.findUnique({
        where: { id: booking.photographerId },
      });
      for (const userId of [booking.customerId, photographer?.userId]) {
        if (userId) {
          await this.notifications.create(
            userId,
            'dispute_resolved',
            '분쟁이 해결되었어요',
            dto.resolution,
            `/bookings/${booking.id}`,
          );
        }
      }
    }

    return updated;
  }

  private async resolveSide(
    booking: { customerId: string; photographerId: string },
    userId: string,
  ): Promise<'customer' | 'photographer'> {
    if (booking.customerId === userId) return 'customer';
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: booking.photographerId },
    });
    if (photographer?.userId === userId) return 'photographer';
    throw new ForbiddenException('예약 당사자만 분쟁을 접수할 수 있습니다.');
  }
}
