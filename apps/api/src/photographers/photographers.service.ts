import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyPhotographerDto } from './dto/apply-photographer.dto';
import { SearchPhotographersQueryDto } from './dto/search-photographers-query.dto';
import { AddAvailabilityDto } from './dto/add-availability.dto';
import { UpdatePhotographerDto } from './dto/update-photographer.dto';
import {
  photographerSummarySelect,
  toPhotographerSummary,
} from './photographer-summary';
import {
  captureModesIncluding,
  captureRequirements,
} from './capture-capabilities';

const BUSINESS_REG_NO_PATTERN = /^\d{10}$/;

@Injectable()
export class PhotographersService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, dto: ApplyPhotographerDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    if (user.role !== 'photographer') {
      throw new ForbiddenException('작가 회원만 지원할 수 있습니다.');
    }

    const existing = await this.prisma.photographer.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('이미 작가 지원 정보가 등록되어 있습니다.');
    }
    const selectedCategories = await this.prisma.shootCategory.findMany({
      where: { code: { in: dto.categories }, isActive: true },
    });
    const selectedModes = await this.prisma.captureMode.count({
      where: { code: { in: dto.captureCapabilities }, isActive: true },
    });
    if (
      selectedCategories.length !== new Set(dto.categories).size ||
      selectedCategories.some(
        (c) => c.businessOnly && dto.photographerType !== 'business',
      ) ||
      selectedModes !== new Set(dto.captureCapabilities).size
    ) {
      throw new BadRequestException(
        '활동 가능한 전문 분야와 촬영 방식을 선택해주세요. 기업 전용 분야는 사업자 작가만 지원할 수 있어요.',
      );
    }

    // TODO: settlementAccount는 스키마상 암호화 저장 대상 — 현재는 평문 저장(추후 KMS 등 연동 필요)
    return this.prisma.photographer.create({
      data: {
        userId,
        photographerType: dto.photographerType,
        businessRegNo:
          dto.photographerType === 'business' ? dto.businessRegNo : null,
        businessName:
          dto.photographerType === 'business' ? dto.businessName : null,
        representativeName:
          dto.photographerType === 'business' ? dto.representativeName : null,
        settlementAccount: dto.settlementAccount,
        settlementAccountHolder: dto.settlementAccountHolder,
        activeRegions: dto.activeRegions,
        moodTags: dto.moodTags,
        categories: dto.categories,
        captureCapabilities: dto.captureCapabilities,
        verificationStatus: 'pending',
      },
      include: {
        user: { select: { name: true } },
        portfolios: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
        packages: true,
      },
    });
  }

  async requestBusinessVerification(userId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { userId },
    });
    if (!photographer) {
      throw new NotFoundException('작가 지원 정보를 먼저 등록해주세요.');
    }
    if (
      photographer.photographerType !== 'business' ||
      !photographer.businessRegNo
    ) {
      throw new BadRequestException(
        '프리랜서 작가는 사업자 인증 절차가 필요 없습니다. 관리자 심사를 통해 SceneFinder 인증을 받아요.',
      );
    }

    // TODO: 국세청 사업자등록정보 진위확인 API 연동 (PRD 3-6/3-12, 세무 검토 선행 필요)
    // 현재는 형식 검증만 수행하며, 최종 승인은 관리자 승인 절차에서 확정
    const isValidFormat = BUSINESS_REG_NO_PATTERN.test(
      photographer.businessRegNo.replace(/-/g, ''),
    );

    return this.prisma.photographer.update({
      where: { userId },
      data: { verificationStatus: isValidFormat ? 'pending' : 'rejected' },
    });
  }

  async getVerificationStatus(id: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id },
      select: { verificationStatus: true },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    return photographer;
  }

  async getProfile(id: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id },
      select: {
        id: true,
        businessName: true,
        photographerType: true,
        representativeName: true,
        activeRegions: true,
        moodTags: true,
        categories: true,
        captureCapabilities: true,
        verificationStatus: true,
        completedBookingsCount: true,
        avgRating: true,
        responseTimeAvgMin: true,
        createdAt: true,
        user: { select: { name: true } },
        portfolios: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
        packages: { orderBy: { basePrice: 'asc' } },
        _count: {
          select: {
            bookings: { where: { review: { is: { isBlinded: false } } } },
          },
        },
      },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    return {
      ...photographer,
      displayName:
        photographer.businessName?.trim() ||
        photographer.user.name.trim() ||
        '사진작가',
      avgRating:
        photographer.avgRating === null ? null : Number(photographer.avgRating),
      reviewCount: photographer._count.bookings,
    };
  }

  async getByUserId(userId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { userId },
      include: {
        portfolios: {
          include: { category: true },
          orderBy: { sortOrder: 'asc' },
        },
        packages: true,
        user: { select: { name: true } },
      },
    });
    if (!photographer) return null;
    return {
      ...photographer,
      displayName: photographer.businessName?.trim() || photographer.user.name,
      avgRating:
        photographer.avgRating === null ? null : Number(photographer.avgRating),
    };
  }

  async updateProfile(userId: string, dto: UpdatePhotographerDto) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { userId },
      include: { packages: true },
    });
    if (!photographer)
      throw new NotFoundException('작가 프로필을 먼저 등록해주세요.');
    if (
      [
        dto.businessName,
        dto.settlementAccount,
        dto.settlementAccountHolder,
      ].some((value) => value !== undefined && !value.trim()) ||
      (dto.activeRegions && !dto.activeRegions.some((region) => region.trim()))
    )
      throw new BadRequestException(
        '작가명, 활동 지역과 정산 정보는 공백으로 저장할 수 없어요.',
      );
    if (dto.categories) {
      const categories = await this.prisma.shootCategory.findMany({
        where: { code: { in: dto.categories }, isActive: true },
      });
      if (
        categories.length !== dto.categories.length ||
        categories.some(
          (c) => c.businessOnly && photographer.photographerType !== 'business',
        )
      ) {
        throw new BadRequestException(
          '활동 가능한 촬영 분야를 선택해주세요. 기업 전용 분야는 사업자 작가만 선택할 수 있어요.',
        );
      }
      if (
        photographer.packages.some(
          (pkg) => !dto.categories!.includes(pkg.category),
        )
      ) {
        throw new BadRequestException(
          '촬영 상품이 등록된 분야는 먼저 해당 상품을 수정하거나 삭제한 뒤 제외해주세요.',
        );
      }
    }
    if (dto.captureCapabilities) {
      const modes = await this.prisma.captureMode.count({
        where: { code: { in: dto.captureCapabilities }, isActive: true },
      });
      if (modes !== dto.captureCapabilities.length)
        throw new BadRequestException('유효한 촬영 방식을 선택해주세요.');
      const available = new Set(
        dto.captureCapabilities.flatMap(captureRequirements),
      );
      if (
        photographer.packages.some(
          (pkg) =>
            pkg.captureModeCode &&
            !captureRequirements(pkg.captureModeCode).every((part) =>
              available.has(part),
            ),
        )
      ) {
        throw new BadRequestException(
          '촬영 상품에 사용 중인 방식은 먼저 해당 상품을 수정한 뒤 제외해주세요.',
        );
      }
    }
    await this.prisma.photographer.update({
      where: { userId },
      data: {
        ...dto,
        ...(dto.businessName ? { businessName: dto.businessName.trim() } : {}),
        ...(dto.activeRegions
          ? {
              activeRegions: [
                ...new Set(
                  dto.activeRegions
                    .map((region) => region.trim())
                    .filter(Boolean),
                ),
              ],
            }
          : {}),
        ...(dto.moodTags
          ? {
              moodTags: [
                ...new Set(
                  dto.moodTags.map((tag) => tag.trim()).filter(Boolean),
                ),
              ],
            }
          : {}),
        ...(dto.settlementAccount
          ? { settlementAccount: dto.settlementAccount.trim() }
          : {}),
        ...(dto.settlementAccountHolder
          ? { settlementAccountHolder: dto.settlementAccountHolder.trim() }
          : {}),
      },
    });
    return this.getByUserId(userId);
  }

  async listUnavailableDates(photographerId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
    }).format(new Date());
    return this.prisma.photographerAvailability.findMany({
      where: { photographerId, date: { gte: new Date(today) } },
      orderBy: { date: 'asc' },
    });
  }

  async addUnavailableDate(userId: string, dto: AddAvailabilityDto) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { userId },
    });
    if (!photographer) {
      throw new NotFoundException('작가 프로필을 먼저 등록해주세요.');
    }
    const start = new Date(`${dto.date.slice(0, 10)}T00:00:00+09:00`);
    const reserved = await this.prisma.booking.findFirst({
      where: {
        photographerId: photographer.id,
        status: { in: ['held', 'deposit_paid', 'confirmed'] },
        shootDatetime: {
          gte: start,
          lt: new Date(start.getTime() + 86_400_000),
        },
      },
    });
    if (reserved)
      throw new BadRequestException(
        '예약이 있는 날짜예요. 예약 일정을 변경한 뒤 휴무일로 등록해주세요.',
      );
    const existing = await this.prisma.photographerAvailability.findUnique({
      where: {
        photographerId_date: {
          photographerId: photographer.id,
          date: new Date(dto.date),
        },
      },
    });
    if (existing) {
      throw new ConflictException('이미 등록된 휴무일입니다.');
    }
    return this.prisma.photographerAvailability.create({
      data: {
        photographerId: photographer.id,
        date: new Date(dto.date),
        reason: dto.reason,
      },
    });
  }

  async removeUnavailableDate(userId: string, dateId: string) {
    const record = await this.prisma.photographerAvailability.findUnique({
      where: { id: dateId },
    });
    if (!record) {
      throw new NotFoundException('휴무일 정보를 찾을 수 없습니다.');
    }
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: record.photographerId },
    });
    if (photographer?.userId !== userId) {
      throw new ForbiddenException('본인 휴무일만 삭제할 수 있습니다.');
    }
    await this.prisma.photographerAvailability.delete({
      where: { id: dateId },
    });
    return { id: dateId, deleted: true };
  }

  async listRegions() {
    const photographers = await this.prisma.photographer.findMany({
      where: { verificationStatus: 'verified', user: { status: 'active' } },
      select: { activeRegions: true },
    });
    return [...new Set(photographers.flatMap((p) => p.activeRegions))]
      .filter((region) => region.trim().length > 0)
      .sort((a, b) => a.localeCompare(b, 'ko'));
  }

  async search(query: SearchPhotographersQueryDto) {
    // 카테고리가 businessOnly로 지정된 분야면(기업/기관/브랜드 등) BUSINESS 유형 작가만 노출
    let requiresBusiness = false;
    if (query.category) {
      const category = await this.prisma.shootCategory.findUnique({
        where: { code: query.category },
      });
      requiresBusiness = category?.businessOnly ?? false;
    }

    const photographers = await this.prisma.photographer.findMany({
      where: {
        verificationStatus: 'verified',
        user: { status: 'active' },
        ...(query.category ? { categories: { has: query.category } } : {}),
        ...(query.region ? { activeRegions: { has: query.region } } : {}),
        ...(query.captureMode
          ? {
              AND: captureRequirements(query.captureMode).map((part) => ({
                captureCapabilities: { hasSome: captureModesIncluding(part) },
              })),
            }
          : {}),
        ...(requiresBusiness ? { photographerType: 'business' as const } : {}),
        ...(query.date
          ? { unavailableDates: { none: { date: new Date(query.date) } } }
          : {}),
      },
      select: {
        ...photographerSummarySelect,
        packages: {
          take: 1,
          orderBy: { basePrice: 'asc' },
          where: {
            ...(query.category ? { category: query.category } : {}),
            ...(query.captureMode
              ? {
                  captureModeCode: {
                    in: captureModesIncluding(query.captureMode),
                  },
                }
              : {}),
          },
          select: { basePrice: true, durationMin: true },
        },
      },
      orderBy:
        query.sort === 'newest'
          ? [{ createdAt: 'desc' }, { id: 'asc' }]
          : [
              { avgRating: { sort: 'desc', nulls: 'last' } },
              { completedBookingsCount: 'desc' },
              { id: 'asc' },
            ],
    });
    const results = photographers.map(toPhotographerSummary);
    if (query.sort === 'price') {
      results.sort(
        (a, b) => (a.startingPrice ?? Infinity) - (b.startingPrice ?? Infinity),
      );
    }
    return results;
  }
}
