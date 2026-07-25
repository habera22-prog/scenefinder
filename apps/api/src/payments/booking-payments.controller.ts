import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId/payments')
export class BookingPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('deposit')
  requestDeposit(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.requestDeposit(bookingId, user.userId);
  }

  @Post('balance')
  requestBalance(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.requestBalance(bookingId, user.userId);
  }

  @Get()
  list(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.listForBooking(bookingId, user.userId);
  }
}
