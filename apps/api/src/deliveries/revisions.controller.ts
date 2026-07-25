import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DeliveriesService } from './deliveries.service';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import { UpdateRevisionRequestDto } from './dto/update-revision-request.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class DeliveryActionsController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post('deliveries/:id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.deliveriesService.confirmDelivery(id, user.userId);
  }

  @Post('deliveries/:id/revision-requests')
  createRevision(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRevisionRequestDto,
  ) {
    return this.deliveriesService.createRevisionRequest(id, user.userId, dto);
  }

  @Patch('revision-requests/:id')
  updateRevision(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRevisionRequestDto,
  ) {
    return this.deliveriesService.updateRevisionRequest(id, user.userId, dto);
  }
}
