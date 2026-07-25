import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, photographerId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: { customerId_photographerId: { customerId, photographerId } },
    });
    if (existing) {
      throw new ConflictException('이미 찜한 작가입니다.');
    }

    return this.prisma.favorite.create({
      data: { customerId, photographerId },
    });
  }

  async remove(customerId: string, photographerId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { customerId_photographerId: { customerId, photographerId } },
    });
    if (!existing) {
      throw new NotFoundException('찜하지 않은 작가입니다.');
    }
    await this.prisma.favorite.delete({ where: { id: existing.id } });
    return { success: true };
  }

  listForCustomer(customerId: string) {
    return this.prisma.favorite.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        photographer: {
          select: {
            id: true,
            businessName: true,
            activeRegions: true,
            moodTags: true,
            categories: true,
            avgRating: true,
            completedBookingsCount: true,
          },
        },
      },
    });
  }
}
