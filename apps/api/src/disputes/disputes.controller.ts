import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post('bookings/:bookingId/disputes')
  create(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.create(bookingId, user.userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('disputes/:id/fact-check-request')
  requestFactCheck(@Param('id') id: string) {
    return this.disputesService.requestFactCheck(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('disputes/:id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputesService.resolve(id, dto);
  }
}
