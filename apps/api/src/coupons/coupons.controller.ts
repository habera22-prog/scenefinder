import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CouponsService } from './coupons.service';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId/coupon')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  apply(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.couponsService.apply(bookingId, user.userId, dto);
  }

  @Delete()
  cancel(@Param('bookingId') bookingId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.couponsService.cancel(bookingId, user.userId);
  }
}
