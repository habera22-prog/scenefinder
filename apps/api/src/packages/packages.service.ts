import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackageDto } from './dto/create-package.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(photographerId: string, userId: string, dto: CreatePackageDto) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    if (photographer.userId !== userId) {
      throw new ForbiddenException('본인 프로필에만 촬영 상품을 등록할 수 있습니다.');
    }
    // PRD 3-12 확정 사항: 유료 촬영상품 등록은 사업자 인증 완료 작가만 가능
    if (photographer.verificationStatus !== 'verified') {
      throw new ForbiddenException(
        '사업자 인증이 완료된 작가만 촬영 상품을 등록할 수 있습니다.',
      );
    }

    return this.prisma.package.create({
      data: {
        photographerId,
        title: dto.title,
        category: dto.category,
        durationMin: dto.durationMin,
        basePrice: dto.basePrice,
        includedPhotos: dto.includedPhotos,
        retouchScope: dto.retouchScope,
        rawIncluded: dto.rawIncluded,
        deliveryDays: dto.deliveryDays,
        options: dto.options as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
