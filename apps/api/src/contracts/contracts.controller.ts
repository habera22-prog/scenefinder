import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';

@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId/contract')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  getOrCreate(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.getOrCreate(bookingId, user.userId);
  }

  @Post('sign')
  sign(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.sign(bookingId, user.userId);
  }

  @Get('history')
  getHistory(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.getHistory(bookingId, user.userId);
  }
}
