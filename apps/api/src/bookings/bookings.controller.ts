import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { CreateConfirmationDto } from './dto/create-confirmation.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user.userId, dto);
  }

  @Post(':id/quote')
  quote(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.bookingsService.quote(id, user.userId, dto);
  }

  @Post(':id/accept-quote')
  acceptQuote(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.acceptQuote(id, user.userId);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingsService.list(user.userId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findById(id, user.userId);
  }

  @Post(':id/confirmations')
  addConfirmation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConfirmationDto,
  ) {
    return this.bookingsService.addConfirmation(id, user.userId, dto);
  }
}
