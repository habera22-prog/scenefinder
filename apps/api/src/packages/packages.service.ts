import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { captureRequirements } from '../photographers/capture-capabilities';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async validate(
    photographerId: string,
    userId: string,
    dto: CreatePackageDto,
  ) {
    if (!dto.title.trim())
      throw new BadRequestException('상품 이름을 입력해주세요.');
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    if (photographer.userId !== userId) {
      throw new ForbiddenException(
        '본인 프로필에만 촬영 상품을 등록할 수 있습니다.',
      );
    }
    if (photographer.verificationStatus !== 'verified') {
      throw new ForbiddenException(
        '관리자 승인이 완료된 작가만 촬영 상품을 등록할 수 있어요.',
      );
    }

    // 카테고리별 시간당 최저가(관리자 설정) 미달 상품 등록 차단 — 수수료 회피용 저가 신고 방지
    const category = await this.prisma.shootCategory.findUnique({
      where: { code: dto.category },
    });
    if (
      !category?.isActive ||
      !photographer.categories.includes(dto.category) ||
      (category.businessOnly && photographer.photographerType !== 'business')
    ) {
      throw new BadRequestException(
        '작가 프로필에 등록한 촬영 분야를 선택해주세요. 기업 전용 분야는 사업자 작가만 등록할 수 있어요.',
      );
    }
    if (dto.captureModeCode) {
      const mode = await this.prisma.captureMode.findFirst({
        where: { code: dto.captureModeCode, isActive: true },
      });
      const available = new Set(
        photographer.captureCapabilities.flatMap(captureRequirements),
      );
      if (
        !mode ||
        !captureRequirements(dto.captureModeCode).every((part) =>
          available.has(part),
        )
      )
        throw new BadRequestException(
          '작가 프로필에 등록한 촬영 방식을 선택해주세요.',
        );
    }
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
  }

  private packageData(dto: CreatePackageDto) {
    return {
      title: dto.title.trim(),
      category: dto.category,
      captureModeCode: dto.captureModeCode || null,
      durationMin: dto.durationMin,
      basePrice: dto.basePrice,
      includedPhotos: dto.includedPhotos,
      retouchScope: dto.retouchScope?.trim() || null,
      rawIncluded: dto.rawIncluded,
      deliveryDays: dto.deliveryDays,
      options: dto.options as Prisma.InputJsonValue | undefined,
    };
  }

  async create(photographerId: string, userId: string, dto: CreatePackageDto) {
    await this.validate(photographerId, userId, dto);
    return this.prisma.package.create({
      data: { photographerId, ...this.packageData(dto) },
    });
  }

  async update(
    photographerId: string,
    packageId: string,
    userId: string,
    dto: CreatePackageDto,
  ) {
    await this.validate(photographerId, userId, dto);
    const pkg = await this.prisma.package.findFirst({
      where: { id: packageId, photographerId },
    });
    if (!pkg) throw new NotFoundException('촬영 상품을 찾을 수 없습니다.');
    return this.prisma.package.update({
      where: { id: packageId },
      data: this.packageData(dto),
    });
  }

  async remove(photographerId: string, packageId: string, userId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) throw new NotFoundException('작가를 찾을 수 없습니다.');
    if (photographer.userId !== userId)
      throw new ForbiddenException('본인 촬영 상품만 삭제할 수 있어요.');
    const pkg = await this.prisma.package.findFirst({
      where: { id: packageId, photographerId },
    });
    if (!pkg) throw new NotFoundException('촬영 상품을 찾을 수 없습니다.');
    if (await this.prisma.booking.count({ where: { packageId } }))
      throw new BadRequestException(
        '예약에 사용된 상품은 기록을 보존하기 위해 삭제할 수 없어요.',
      );
    await this.prisma.package.delete({ where: { id: packageId } });
    return { id: packageId, deleted: true };
  }
}
