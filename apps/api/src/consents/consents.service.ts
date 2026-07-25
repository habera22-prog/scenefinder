import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetConsentDto } from './dto/set-consent.dto';

@Injectable()
export class ConsentsService {
  constructor(private readonly prisma: PrismaService) {}

  async set(bookingId: string, userId: string, dto: SetConsentDto) {
    await this.getBookingForCustomer(bookingId, userId);

    if (dto.minorIncluded && !dto.guardianConsentGiven) {
      throw new BadRequestException(
        '미성년자가 포함된 경우 법정대리인 동의가 필요합니다.',
      );
    }

    const existing = await this.prisma.consent.findFirst({
      where: { bookingId },
    });
    const data = {
      type: dto.type,
      minorIncluded: dto.minorIncluded,
      guardianConsentAt: dto.minorIncluded ? new Date() : null,
    };

    if (existing) {
      return this.prisma.consent.update({ where: { id: existing.id }, data });
    }
    return this.prisma.consent.create({ data: { bookingId, ...data } });
  }

  async get(bookingId: string, userId: string) {
    await this.assertParticipant(bookingId, userId);
    const consent = await this.prisma.consent.findFirst({
      where: { bookingId },
    });
    if (!consent) {
      throw new NotFoundException('동의 정보가 없습니다.');
    }
    return consent;
  }

  private async getBookingForCustomer(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    if (booking.customerId !== userId) {
      throw new ForbiddenException(
        '예약 당사자인 고객만 동의를 설정할 수 있습니다.',
      );
    }
    return booking;
  }

  private async assertParticipant(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    if (booking.customerId === userId) return;
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: booking.photographerId },
    });
    if (photographer?.userId === userId) return;
    throw new ForbiddenException('예약 당사자만 접근할 수 있습니다.');
  }
}
