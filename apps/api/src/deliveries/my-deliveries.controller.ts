import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DeliveriesService } from './deliveries.service';

@UseGuards(JwtAuthGuard)
@Controller('customers/me/deliveries')
export class MyDeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveriesService.listForCustomer(user.userId);
  }
}
