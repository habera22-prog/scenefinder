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

    // 카테고리별 시간당 최저가(관리자 설정) 미달 상품 등록 차단 — 수수료 회피용 저가 신고 방지
    const category = await this.prisma.shootCategory.findUnique({
      where: { code: dto.category },
    });
    if (category?.minHourlyRate) {
      const minAmount = Math.ceil(
        (category.minHourlyRate * dto.durationMin) / 60,
      );
      if (dto.basePrice < minAmount) {
        throw new ForbiddenException(
          `이 분야("${category.label}")는 시간당 최저가 ${category.minHourlyRate.toLocaleString()}원이 적용돼요. ${dto.durationMin}분 상품이면 최소 ${minAmount.toLocaleString()}원 이상으로 등록해야 합니다.`,
        );
      }
    }

    return this.prisma.package.create({
      data: {
        photographerId,
        title: dto.title,
        category: dto.category,
        captureModeCode: dto.captureModeCode,
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
