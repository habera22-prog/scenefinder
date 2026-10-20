import {
  BadRequestException,
  GoneException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, extname, resolve, sep } from 'node:path';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import { UpdateRevisionRequestDto } from './dto/update-revision-request.dto';
import { NotificationsService } from '../notifications/notifications.service';

const DOWNLOAD_EXPIRY_DAYS = 30;
const PHOTO_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const DELIVERY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface DeliveryPhotoFile {
  filePath: string;
  filename: string;
  contentType: string;
  size: number;
}

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

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
        photoUrls: dto.photoUrls,
        representativePhotoUrls: dto.representativePhotoUrls,
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
    await this.notifications.create(
      booking.customerId,
      'delivery_ready',
      '사진이 도착했어요',
      '촬영 결과물이 업로드되었어요. 확인해보세요.',
      `/me/photos?deliveryId=${delivery.id}`,
    );
    return delivery;
  }

  async createShareLink(bookingId: string, userId: string) {
    await this.getBookingForPhotographer(bookingId, userId);
    const delivery = await this.prisma.delivery.findFirst({
      where: { bookingId },
      orderBy: { deliveredAt: 'desc' },
    });
    if (!delivery) {
      throw new NotFoundException('전달된 사진을 찾을 수 없습니다.');
    }
    if (
      !delivery.downloadExpiresAt ||
      delivery.downloadExpiresAt.getTime() <= Date.now()
    ) {
      throw new GoneException('사진 공유 기간이 만료되었습니다.');
    }

    const expiresAtSeconds = Math.floor(
      delivery.downloadExpiresAt.getTime() / 1000,
    );
    const token = this.createShareToken(delivery.id, expiresAtSeconds);
    const frontendUrl = this.config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');

    return {
      shareUrl: `${frontendUrl}/shared-deliveries/${token}`,
      expiresAt: delivery.downloadExpiresAt,
    };
  }

  async getCustomerPhotoFile(
    deliveryId: string,
    customerId: string,
    photoIndex: number,
  ): Promise<DeliveryPhotoFile> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { booking: { select: { customerId: true } } },
    });
    if (!delivery) {
      throw new NotFoundException('전달된 사진을 찾을 수 없습니다.');
    }
    if (delivery.booking.customerId !== customerId) {
      throw new ForbiddenException(
        '예약 고객만 사진을 다운로드할 수 있습니다.',
      );
    }
    this.assertDownloadAvailable(delivery.downloadExpiresAt);
    return this.resolvePhotoFile(delivery.photoUrls, delivery.id, photoIndex);
  }

  async getSharedDelivery(token: string) {
    const delivery = await this.findSharedDelivery(token);
    const photoUrls = this.asPhotoUrls(delivery.photoUrls);
    return {
      id: delivery.id,
      photoCount: photoUrls.length,
      deliveredAt: delivery.deliveredAt,
      downloadExpiresAt: delivery.downloadExpiresAt,
      booking: {
        shootDatetime: delivery.booking.shootDatetime,
        location: delivery.booking.location,
        photographer: delivery.booking.photographer,
      },
    };
  }

  async getSharedPhotoFile(
    token: string,
    photoIndex: number,
  ): Promise<DeliveryPhotoFile> {
    const delivery = await this.findSharedDelivery(token);
    return this.resolvePhotoFile(delivery.photoUrls, delivery.id, photoIndex);
  }

  private createShareToken(deliveryId: string, expiresAtSeconds: number) {
    const payload = `${deliveryId}.${expiresAtSeconds}`;
    return `${payload}.${this.signSharePayload(payload)}`;
  }

  private signSharePayload(payload: string) {
    const secret = this.config.get<string>('JWT_SECRET', 'dev-secret');
    return createHmac('sha256', secret)
      .update(`scenefinder-delivery-share:v1:${payload}`)
      .digest('base64url');
  }

  private async findSharedDelivery(token: string) {
    const [deliveryId, expiresAtText, signature, ...extra] = token.split('.');
    const expiresAtSeconds = Number(expiresAtText);
    if (
      extra.length > 0 ||
      !DELIVERY_ID_PATTERN.test(deliveryId ?? '') ||
      !/^\d+$/.test(expiresAtText ?? '') ||
      !Number.isSafeInteger(expiresAtSeconds) ||
      !/^[A-Za-z0-9_-]{43}$/.test(signature ?? '')
    ) {
      throw new NotFoundException('유효하지 않은 사진 공유 링크입니다.');
    }

    const payload = `${deliveryId}.${expiresAtSeconds}`;
    const expectedSignature = Buffer.from(this.signSharePayload(payload));
    const actualSignature = Buffer.from(signature);
    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      throw new NotFoundException('유효하지 않은 사진 공유 링크입니다.');
    }
    if (expiresAtSeconds * 1000 <= Date.now()) {
      throw new GoneException('사진 공유 기간이 만료되었습니다.');
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        booking: {
          select: {
            shootDatetime: true,
            location: true,
            photographer: { select: { businessName: true } },
          },
        },
      },
    });
    if (!delivery) {
      throw new NotFoundException('전달된 사진을 찾을 수 없습니다.');
    }
    if (
      !delivery.downloadExpiresAt ||
      Math.floor(delivery.downloadExpiresAt.getTime() / 1000) !==
        expiresAtSeconds
    ) {
      throw new NotFoundException('유효하지 않은 사진 공유 링크입니다.');
    }
    this.assertDownloadAvailable(delivery.downloadExpiresAt);
    return delivery;
  }

  private assertDownloadAvailable(expiresAt: Date | null) {
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      throw new GoneException('사진 다운로드 기간이 만료되었습니다.');
    }
  }

  private asPhotoUrls(photoUrls: Prisma.JsonValue): string[] {
    if (!Array.isArray(photoUrls)) return [];
    return photoUrls.filter((url): url is string => typeof url === 'string');
  }

  private async resolvePhotoFile(
    photoUrls: Prisma.JsonValue,
    deliveryId: string,
    photoIndex: number,
  ): Promise<DeliveryPhotoFile> {
    const photoUrl = this.asPhotoUrls(photoUrls)[photoIndex];
    if (!Number.isInteger(photoIndex) || photoIndex < 0 || !photoUrl) {
      throw new NotFoundException('사진 파일을 찾을 수 없습니다.');
    }
    const uploadPrefix = '/uploads/';
    if (!photoUrl.startsWith(uploadPrefix)) {
      throw new NotFoundException('다운로드할 수 있는 사진 파일이 아닙니다.');
    }
    const storedFilename = photoUrl.slice(uploadPrefix.length);
    if (!storedFilename || basename(storedFilename) !== storedFilename) {
      throw new NotFoundException('사진 파일을 찾을 수 없습니다.');
    }
    const extension = extname(storedFilename).toLowerCase();
    const contentType = PHOTO_CONTENT_TYPES[extension];
    if (!contentType) {
      throw new BadRequestException('지원하지 않는 사진 파일 형식입니다.');
    }

    const uploadDirectory = resolve(process.cwd(), 'uploads');
    const filePath = resolve(uploadDirectory, storedFilename);
    if (!filePath.startsWith(`${uploadDirectory}${sep}`)) {
      throw new NotFoundException('사진 파일을 찾을 수 없습니다.');
    }
    let fileInfo: Awaited<ReturnType<typeof fs.stat>>;
    try {
      fileInfo = await fs.stat(filePath);
    } catch {
      throw new NotFoundException('사진 파일을 찾을 수 없습니다.');
    }
    if (!fileInfo.isFile()) {
      throw new NotFoundException('사진 파일을 찾을 수 없습니다.');
    }

    return {
      filePath,
      filename: `scenefinder-${deliveryId.slice(0, 8)}-${photoIndex + 1}${extension}`,
      contentType,
      size: fileInfo.size,
    };
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

  listForCustomer(customerId: string) {
    return this.prisma.delivery.findMany({
      where: { booking: { customerId } },
      orderBy: { deliveredAt: 'desc' },
      select: {
        id: true,
        bookingId: true,
        representativePhotoUrls: true,
        photoUrls: true,
        deliveredAt: true,
        downloadExpiresAt: true,
        customerConfirmedAt: true,
        booking: {
          select: {
            location: true,
            shootDatetime: true,
            photographer: { select: { businessName: true } },
          },
        },
      },
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
