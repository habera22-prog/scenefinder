import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ConsentsService } from './consents.service';
import { SetConsentDto } from './dto/set-consent.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId/consent')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post()
  set(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetConsentDto,
  ) {
    return this.consentsService.set(bookingId, user.userId, dto);
  }

  @Get()
  get(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consentsService.get(bookingId, user.userId);
  }
}
