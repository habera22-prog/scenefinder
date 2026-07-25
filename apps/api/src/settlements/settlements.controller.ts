import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { SettlementsService } from './settlements.service';

@Controller()
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('photographers/:photographerId/settlements')
  list(
    @Param('photographerId') photographerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settlementsService.listForPhotographer(
      photographerId,
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('photographers/:photographerId/settlements/:settlementId/items')
  items(
    @Param('photographerId') photographerId: string,
    @Param('settlementId') settlementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settlementsService.getItems(
      photographerId,
      settlementId,
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/settlements/run-weekly')
  runWeekly() {
    return this.settlementsService.runWeekly();
  }
}
