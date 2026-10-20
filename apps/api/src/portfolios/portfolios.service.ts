import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

@Injectable()
export class PortfoliosService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwner(photographerId: string, userId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) throw new NotFoundException('작가를 찾을 수 없습니다.');
    if (photographer.userId !== userId)
      throw new ForbiddenException('본인 작품만 관리할 수 있어요.');
    return photographer;
  }

  async update(
    photographerId: string,
    portfolioId: string,
    userId: string,
    dto: UpdatePortfolioDto,
  ) {
    const photographer = await this.assertOwner(photographerId, userId);
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, photographerId },
    });
    if (!portfolio) throw new NotFoundException('작품을 찾을 수 없습니다.');
    if (dto.categoryId) {
      const category = await this.prisma.shootCategory.findFirst({
        where: { id: dto.categoryId, isActive: true },
      });
      if (
        !category ||
        !photographer.categories.includes(category.code) ||
        (category.businessOnly && photographer.photographerType !== 'business')
      )
        throw new BadRequestException(
          '작가 프로필에 등록한 촬영 분야를 선택해주세요.',
        );
    }
    return this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: dto,
      include: { category: true },
    });
  }

  async reorder(photographerId: string, userId: string, ids: string[]) {
    await this.assertOwner(photographerId, userId);
    const existing = await this.prisma.portfolio.findMany({
      where: { photographerId },
      select: { id: true },
    });
    if (
      existing.length !== ids.length ||
      existing.some((item) => !ids.includes(item.id))
    )
      throw new BadRequestException(
        '작품 목록이 변경됐어요. 페이지를 새로고침한 뒤 다시 정렬해주세요.',
      );
    await this.prisma.$transaction(
      ids.map((id, sortOrder) =>
        this.prisma.portfolio.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    return this.prisma.portfolio.findMany({
      where: { photographerId },
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async remove(photographerId: string, portfolioId: string, userId: string) {
    await this.assertOwner(photographerId, userId);
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, photographerId },
    });
    if (!portfolio) throw new NotFoundException('작품을 찾을 수 없습니다.');
    await this.prisma.portfolio.delete({ where: { id: portfolioId } });
    return { id: portfolioId, deleted: true };
  }

  async create(
    photographerId: string,
    userId: string,
    dto: CreatePortfolioDto,
  ) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    if (photographer.userId !== userId) {
      throw new ForbiddenException(
        '본인 프로필에만 포트폴리오를 등록할 수 있습니다.',
      );
    }

    const category = await this.prisma.shootCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || !category.isActive) {
      throw new NotFoundException('유효하지 않은 촬영 분야입니다.');
    }
    if (
      !photographer.categories.includes(category.code) ||
      (category.businessOnly && photographer.photographerType !== 'business')
    )
      throw new BadRequestException(
        '작가 프로필에 등록한 촬영 분야를 선택해주세요.',
      );

    const last = await this.prisma.portfolio.aggregate({
      where: { photographerId },
      _max: { sortOrder: true },
    });
    return this.prisma.portfolio.create({
      data: {
        photographerId,
        categoryId: dto.categoryId,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? (last._max.sortOrder ?? -1) + 1,
      },
      include: { category: true },
    });
  }
}
