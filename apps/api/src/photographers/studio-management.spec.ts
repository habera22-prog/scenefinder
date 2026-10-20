import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PackagesService } from '../packages/packages.service';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { BookingsService } from '../bookings/bookings.service';
import { PhotographersService } from './photographers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractsService } from '../contracts/contracts.service';

function fixtures() {
  const photographer = {
    id: 'artist',
    userId: 'owner',
    verificationStatus: 'verified',
    photographerType: 'freelancer',
    categories: ['family'],
    captureCapabilities: ['photo'],
    packages: [{ category: 'family', captureModeCode: 'photo' }],
  };
  const db = {
    photographer: {
      findUnique: jest.fn().mockResolvedValue(photographer),
      update: jest.fn(),
    },
    shootCategory: {
      findUnique: jest.fn().mockResolvedValue({
        code: 'family',
        isActive: true,
        businessOnly: false,
        minHourlyRate: 0,
      }),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    captureMode: {
      findFirst: jest.fn().mockResolvedValue({ code: 'photo' }),
      count: jest.fn(),
    },
    package: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'pkg', photographerId: 'artist' }),
      update: jest.fn(),
      delete: jest.fn(),
    },
    portfolio: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    booking: {
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    photographerAvailability: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  return { db, prisma: db as unknown as PrismaService, photographer };
}

describe('작가 상품과 작품 관리', () => {
  const dto = {
    title: '가족 촬영',
    category: 'family',
    captureModeCode: 'photo',
    durationMin: 60,
    basePrice: 100000,
    includedPhotos: 10,
    rawIncluded: false,
    deliveryDays: 7,
  };

  it('다른 작가의 상품은 수정할 수 없다', async () => {
    const { db, prisma } = fixtures();
    await expect(
      new PackagesService(prisma).update('artist', 'pkg', 'stranger', dto),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.package.update).not.toHaveBeenCalled();
  });

  it('URL의 작가에게 속하지 않는 상품은 수정하지 않는다', async () => {
    const { db, prisma } = fixtures();
    db.package.findFirst.mockResolvedValue(null);
    await expect(
      new PackagesService(prisma).update(
        'artist',
        'other-package',
        'owner',
        dto,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.package.update).not.toHaveBeenCalled();
  });

  it('프로필에 없는 촬영 방식은 상품에 지정할 수 없다', async () => {
    const { db, prisma } = fixtures();
    await expect(
      new PackagesService(prisma).update('artist', 'pkg', 'owner', {
        ...dto,
        captureModeCode: 'video',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.package.update).not.toHaveBeenCalled();
  });

  it('기업 전용 분야는 프리랜서 상품에 지정할 수 없다', async () => {
    const { db, prisma } = fixtures();
    db.shootCategory.findUnique.mockResolvedValue({
      code: 'family',
      isActive: true,
      businessOnly: true,
    });
    await expect(
      new PackagesService(prisma).update('artist', 'pkg', 'owner', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('이미 예약에 사용한 상품을 삭제하지 않는다', async () => {
    const { db, prisma } = fixtures();
    db.booking.count.mockResolvedValue(1);
    await expect(
      new PackagesService(prisma).remove('artist', 'pkg', 'owner'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.package.delete).not.toHaveBeenCalled();
  });

  it('다른 작가의 작품은 삭제하지 않는다', async () => {
    const { db, prisma } = fixtures();
    await expect(
      new PortfoliosService(prisma).remove('artist', 'work', 'stranger'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.portfolio.delete).not.toHaveBeenCalled();
  });

  it('작품 정렬 목록에 다른 작가의 작품을 끼워 넣으면 저장하지 않는다', async () => {
    const { db, prisma } = fixtures();
    db.portfolio.findMany.mockResolvedValue([
      { id: 'work-1' },
      { id: 'work-2' },
    ]);
    await expect(
      new PortfoliosService(prisma).reorder('artist', 'owner', [
        'work-1',
        'foreign',
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('작가 프로필과 일정', () => {
  it('상품에 사용 중인 전문 분야를 프로필에서 제거하지 않는다', async () => {
    const { db, prisma } = fixtures();
    db.shootCategory.findMany.mockResolvedValue([
      { code: 'couple', isActive: true, businessOnly: false },
    ]);
    await expect(
      new PhotographersService(prisma).updateProfile('owner', {
        categories: ['couple'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.photographer.update).not.toHaveBeenCalled();
  });

  it('상품에 사용 중인 촬영 방식을 프로필에서 제거하지 않는다', async () => {
    const { db, prisma } = fixtures();
    db.captureMode.count.mockResolvedValue(1);
    await expect(
      new PhotographersService(prisma).updateProfile('owner', {
        captureCapabilities: ['video'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.photographer.update).not.toHaveBeenCalled();
  });

  it('한국 시간으로 예약이 있는 날은 휴무일로 등록하지 않는다', async () => {
    const { db, prisma } = fixtures();
    db.booking.findFirst.mockResolvedValue({ id: 'reserved' });
    await expect(
      new PhotographersService(prisma).addUnavailableDate('owner', {
        date: '2026-11-03',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.booking.findFirst).toHaveBeenCalledWith({
      where: {
        photographerId: 'artist',
        status: { in: ['held', 'deposit_paid', 'confirmed'] },
        shootDatetime: {
          gte: new Date('2026-11-02T15:00:00Z'),
          lt: new Date('2026-11-03T15:00:00Z'),
        },
      },
    });
    expect(db.photographerAvailability.create).not.toHaveBeenCalled();
  });
});

describe('견적 수정과 다시 보내기', () => {
  function setup(status = 'quoted') {
    const fixture = fixtures();
    fixture.db.booking.findUnique.mockResolvedValue({
      id: 'booking',
      photographerId: 'artist',
      customerId: 'customer',
      shootCategoryId: 'category',
      packageId: null,
      status,
    });
    const notifications = { create: jest.fn() };
    const service = new BookingsService(
      fixture.prisma,
      notifications as unknown as NotificationsService,
      {} as ContractsService,
    );
    return { ...fixture, service, notifications };
  }

  it('수락 전 견적을 다시 보내면 금액과 1시간 기한을 갱신한다', async () => {
    const { db, service, notifications } = setup();
    const start = Date.now();
    await service.quote('booking', 'owner', { totalAmount: 120000 });
    const [call] = db.booking.updateMany.mock.calls[0] as [
      {
        data: { totalAmount: number; holdExpiresAt: Date };
      },
    ];
    expect(call.data.totalAmount).toBe(120000);
    expect(call.data.holdExpiresAt.getTime()).toBeGreaterThanOrEqual(
      start + 3600000,
    );
    expect(call.data.holdExpiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 3600000,
    );
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });

  it.each(['held', 'deposit_paid', 'confirmed', 'cancelled'])(
    '%s 예약은 견적으로 되돌리지 않는다',
    async (status) => {
      const { db, service } = setup(status);
      await expect(
        service.quote('booking', 'owner', { totalAmount: 120000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.booking.updateMany).not.toHaveBeenCalled();
    },
  );

  it('처리 도중 고객이 수락한 예약은 덮어쓰거나 새 견적 알림을 보내지 않는다', async () => {
    const { db, service, notifications } = setup();
    db.booking.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.quote('booking', 'owner', { totalAmount: 120000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking', status: { in: ['inquiry', 'quoted'] } },
      }),
    );
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
