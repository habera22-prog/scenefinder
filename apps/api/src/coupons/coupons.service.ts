import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(bookingId: string, userId: string, dto: ApplyCouponDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { couponRedemption: true },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    if (booking.customerId !== userId) {
      throw new ForbiddenException('예약 당사자인 고객만 쿠폰을 적용할 수 있습니다.');
    }
    if (booking.status !== 'quoted') {
      throw new BadRequestException(
        '견적을 확인한 뒤(수락 전)에만 쿠폰을 적용할 수 있습니다.',
      );
    }
    if (booking.couponRedemption) {
      throw new BadRequestException(
        '이미 쿠폰이 적용된 예약이에요. 다른 쿠폰을 쓰려면 먼저 취소해주세요.',
      );
    }
    if (booking.totalAmount === null || booking.depositAmount === null || booking.balanceAmount === null) {
      throw new BadRequestException('견적이 확정되지 않은 예약입니다.');
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (!coupon || !coupon.isActive) {
      throw new NotFoundException('유효하지 않은 쿠폰 코드입니다.');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('만료된 쿠폰입니다.');
    }
    if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
      throw new BadRequestException('쿠폰 사용 가능 횟수를 모두 소진했습니다.');
    }
    if (coupon.minOrderAmount !== null && booking.totalAmount < coupon.minOrderAmount) {
      throw new BadRequestException(
        `이 쿠폰은 ${coupon.minOrderAmount.toLocaleString()}원 이상 견적에만 적용할 수 있어요.`,
      );
    }

    const rawDiscount =
      coupon.discountType === 'fixed'
        ? coupon.discountValue
        : Math.round((booking.totalAmount * coupon.discountValue) / 100);
    const cappedDiscount =
      coupon.maxDiscountAmount !== null ? Math.min(rawDiscount, coupon.maxDiscountAmount) : rawDiscount;
    const discountAmount = Math.min(cappedDiscount, booking.totalAmount);

    const newTotal = booking.totalAmount - discountAmount;
    const newDeposit = Math.round((booking.depositAmount * newTotal) / booking.totalAmount);
    const newBalance = newTotal - newDeposit;

    const [updatedBooking] = await Promise.all([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { totalAmount: newTotal, depositAmount: newDeposit, balanceAmount: newBalance },
      }),
      this.prisma.couponRedemption.create({
        data: {
          couponId: coupon.id,
          bookingId,
          customerId: userId,
          originalTotalAmount: booking.totalAmount,
          originalDepositAmount: booking.depositAmount,
          originalBalanceAmount: booking.balanceAmount,
          discountAmount,
        },
      }),
      this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { redemptionCount: { increment: 1 } },
      }),
    ]);

    return { booking: updatedBooking, discountAmount, couponName: coupon.name };
  }

  async cancel(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { couponRedemption: true },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    if (booking.customerId !== userId) {
      throw new ForbiddenException('예약 당사자인 고객만 쿠폰을 취소할 수 있습니다.');
    }
    if (booking.status !== 'quoted') {
      throw new BadRequestException('견적 수락 전 상태에서만 쿠폰 적용을 취소할 수 있습니다.');
    }
    const redemption = booking.couponRedemption;
    if (!redemption) {
      throw new NotFoundException('적용된 쿠폰이 없습니다.');
    }

    const [updatedBooking] = await Promise.all([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          totalAmount: redemption.originalTotalAmount,
          depositAmount: redemption.originalDepositAmount,
          balanceAmount: redemption.originalBalanceAmount,
        },
      }),
      this.prisma.couponRedemption.delete({ where: { bookingId } }),
      this.prisma.coupon.update({
        where: { id: redemption.couponId },
        data: { redemptionCount: { decrement: 1 } },
      }),
    ]);

    return updatedBooking;
  }
}
