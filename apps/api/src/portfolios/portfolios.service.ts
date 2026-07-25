import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';

@Injectable()
export class PortfoliosService {
  constructor(private readonly prisma: PrismaService) {}

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
      throw new ForbiddenException('본인 프로필에만 포트폴리오를 등록할 수 있습니다.');
    }

    const category = await this.prisma.shootCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || !category.isActive) {
      throw new NotFoundException('유효하지 않은 촬영 분야입니다.');
    }

    return this.prisma.portfolio.create({
      data: {
        photographerId,
        categoryId: dto.categoryId,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }
}
