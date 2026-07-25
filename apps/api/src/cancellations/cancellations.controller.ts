import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CancellationsService } from './cancellations.service';
import { CreateCancellationDto } from './dto/create-cancellation.dto';
import { AddActualCostsDto } from './dto/actual-costs.dto';
import { PreviewCancellationQueryDto } from './dto/preview-cancellation-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId')
export class CancellationsController {
  constructor(private readonly cancellationsService: CancellationsService) {}

  @Get('cancellation-preview')
  preview(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PreviewCancellationQueryDto,
  ) {
    return this.cancellationsService.preview(
      bookingId,
      user.userId,
      query.initiatedBy,
    );
  }

  @Post('cancel')
  cancel(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCancellationDto,
  ) {
    return this.cancellationsService.cancel(
      bookingId,
      user.userId,
      dto.initiatedBy,
    );
  }

  @Post('cancel/actual-costs')
  addActualCosts(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddActualCostsDto,
  ) {
    return this.cancellationsService.addActualCosts(
      bookingId,
      user.userId,
      dto,
    );
  }
}
