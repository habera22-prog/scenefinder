import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

const FACT_CHECK_SLA_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return dispute;
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

    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'resolved',
        resolution: dto.resolution,
        resolvedAt: new Date(),
      },
    });
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
