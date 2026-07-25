import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import { UpdateRevisionRequestDto } from './dto/update-revision-request.dto';

const DOWNLOAD_EXPIRY_DAYS = 30;

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async completeBooking(bookingId: string, userId: string) {
    const booking = await this.getBookingForPhotographer(bookingId, userId);
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(
        '잔금 결제까지 완료된(confirmed) 예약만 촬영완료 처리할 수 있습니다.',
      );
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'completed' },
    });
  }

  async createDelivery(
    bookingId: string,
    userId: string,
    dto: CreateDeliveryDto,
  ) {
    const booking = await this.getBookingForPhotographer(bookingId, userId);
    if (booking.status !== 'completed') {
      throw new BadRequestException(
        '촬영완료 처리된 예약만 사진을 업로드할 수 있습니다.',
      );
    }

    const delivery = await this.prisma.delivery.create({
      data: {
        bookingId,
        photoUrls: dto.photoUrls as unknown as Prisma.InputJsonValue,
        representativePhotoUrls: dto.representativePhotoUrls as unknown as
          | Prisma.InputJsonValue
          | undefined,
        deliveredAt: new Date(),
        downloadExpiresAt: new Date(
          Date.now() + DOWNLOAD_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'delivered' },
    });
    return delivery;
  }

  async confirmDelivery(deliveryId: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { booking: true },
    });
    if (!delivery) {
      throw new NotFoundException('납품 정보를 찾을 수 없습니다.');
    }
    if (delivery.booking.customerId !== userId) {
      throw new ForbiddenException(
        '예약 당사자인 고객만 납품을 확인할 수 있습니다.',
      );
    }
    if (delivery.customerConfirmedAt) {
      return delivery;
    }

    const updated = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { customerConfirmedAt: new Date() },
    });
    await this.prisma.booking.update({
      where: { id: delivery.bookingId },
      data: { status: 'closed' },
    });
    await this.prisma.photographer.update({
      where: { id: delivery.booking.photographerId },
      data: { completedBookingsCount: { increment: 1 } },
    });
    return updated;
  }

  async createRevisionRequest(
    deliveryId: string,
    userId: string,
    dto: CreateRevisionRequestDto,
  ) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { booking: true },
    });
    if (!delivery) {
      throw new NotFoundException('납품 정보를 찾을 수 없습니다.');
    }
    if (delivery.booking.customerId !== userId) {
      throw new ForbiddenException(
        '예약 당사자인 고객만 수정 요청을 할 수 있습니다.',
      );
    }

    return this.prisma.revisionRequest.create({
      data: {
        deliveryId,
        photoRef: dto.photoRef,
        requestType: dto.requestType,
        description: dto.description,
        status: 'requested',
      },
    });
  }

  async updateRevisionRequest(
    id: string,
    userId: string,
    dto: UpdateRevisionRequestDto,
  ) {
    const revision = await this.prisma.revisionRequest.findUnique({
      where: { id },
      include: { delivery: { include: { booking: true } } },
    });
    if (!revision) {
      throw new NotFoundException('수정 요청을 찾을 수 없습니다.');
    }

    const photographer = await this.prisma.photographer.findUnique({
      where: { id: revision.delivery.booking.photographerId },
    });
    if (photographer?.userId !== userId) {
      throw new ForbiddenException(
        '담당 작가만 수정 요청 상태를 변경할 수 있습니다.',
      );
    }

    return this.prisma.revisionRequest.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  private async getBookingForPhotographer(bookingId: string, userId: string) {
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
      throw new ForbiddenException('담당 작가만 처리할 수 있습니다.');
    }
    return booking;
  }
}
