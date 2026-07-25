import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId')
export class BookingDeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post('complete')
  complete(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveriesService.completeBooking(bookingId, user.userId);
  }

  @Post('deliveries')
  create(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeliveryDto,
  ) {
    return this.deliveriesService.createDelivery(bookingId, user.userId, dto);
  }
}
