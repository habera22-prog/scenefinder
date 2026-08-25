import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyPhotographerDto } from './dto/apply-photographer.dto';
import { SearchPhotographersQueryDto } from './dto/search-photographers-query.dto';
import { AddAvailabilityDto } from './dto/add-availability.dto';

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

    // TODO: settlementAccount는 스키마상 암호화 저장 대상 — 현재는 평문 저장(추후 KMS 등 연동 필요)
    return this.prisma.photographer.create({
      data: {
        userId,
        businessRegNo: dto.businessRegNo,
        businessName: dto.businessName,
        representativeName: dto.representativeName,
        settlementAccount: dto.settlementAccount,
        settlementAccountHolder: dto.settlementAccountHolder,
        activeRegions: dto.activeRegions,
        moodTags: dto.moodTags,
        categories: dto.categories,
        captureCapabilities: dto.captureCapabilities,
        verificationStatus: 'pending',
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
        portfolios: { include: { category: true }, orderBy: { sortOrder: 'asc' } },
        packages: true,
      },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    return photographer;
  }

  async getByUserId(userId: string) {
    return this.prisma.photographer.findUnique({
      where: { userId },
      include: {
        portfolios: { include: { category: true }, orderBy: { sortOrder: 'asc' } },
        packages: true,
      },
    });
  }

  async listUnavailableDates(photographerId: string) {
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: photographerId },
    });
    if (!photographer) {
      throw new NotFoundException('작가를 찾을 수 없습니다.');
    }
    return this.prisma.photographerAvailability.findMany({
      where: { photographerId, date: { gte: new Date() } },
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
    await this.prisma.photographerAvailability.delete({ where: { id: dateId } });
    return { id: dateId, deleted: true };
  }

  search(query: SearchPhotographersQueryDto) {
    return this.prisma.photographer.findMany({
      where: {
        verificationStatus: 'verified',
        ...(query.category ? { categories: { has: query.category } } : {}),
        ...(query.region ? { activeRegions: { has: query.region } } : {}),
        ...(query.captureMode
          ? { captureCapabilities: { has: query.captureMode } }
          : {}),
      },
      select: {
        id: true,
        businessName: true,
        activeRegions: true,
        moodTags: true,
        categories: true,
        captureCapabilities: true,
        avgRating: true,
        completedBookingsCount: true,
      },
      orderBy: { avgRating: 'desc' },
    });
  }
}
