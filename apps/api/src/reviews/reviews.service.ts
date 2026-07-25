import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(bookingId: string, userId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    if (booking.customerId !== userId) {
      throw new ForbiddenException(
        '예약 당사자인 고객만 후기를 작성할 수 있습니다.',
      );
    }
    if (booking.status !== 'closed') {
      throw new BadRequestException(
        '결제·촬영이 모두 완료된 예약만 후기를 작성할 수 있습니다.',
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: { bookingId },
    });
    if (existing) {
      throw new ConflictException('이미 후기를 작성한 예약입니다.');
    }

    const review = await this.prisma.review.create({
      data: {
        bookingId,
        ratingOverall: dto.ratingOverall,
        ratingKindness: dto.ratingKindness,
        ratingPunctual: dto.ratingPunctual,
        ratingCommunication: dto.ratingCommunication,
        ratingSpeed: dto.ratingSpeed,
        willReuse: dto.willReuse,
        category: dto.category,
        content: dto.content,
      },
    });

    await this.recalculateAverageRating(booking.photographerId);
    return review;
  }

  async listForPhotographer(photographerId: string, category?: string) {
    return this.prisma.review.findMany({
      where: {
        booking: { photographerId },
        isBlinded: false,
        ...(category ? { category } : {}),
      },
    });
  }

  private async recalculateAverageRating(photographerId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { booking: { photographerId } },
      select: { ratingOverall: true },
    });
    if (reviews.length === 0) return;
    const avg =
      reviews.reduce((sum, r) => sum + r.ratingOverall, 0) / reviews.length;
    await this.prisma.photographer.update({
      where: { id: photographerId },
      data: { avgRating: avg },
    });
  }
}
