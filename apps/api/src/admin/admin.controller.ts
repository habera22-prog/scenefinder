import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.adminService.getDashboard();
  }

  @Post('photographers/:id/approve')
  approve(@Param('id') id: string) {
    return this.adminService.approvePhotographer(id);
  }

  @Post('photographers/:id/suspend')
  suspend(@Param('id') id: string) {
    return this.adminService.suspendPhotographer(id);
  }

  @Post('payments/:id/refund')
  refund(@Param('id') id: string, @Body() dto: RefundPaymentDto) {
    return this.adminService.refundPayment(id, dto);
  }

  @Post('reviews/:id/blind')
  blind(@Param('id') id: string) {
    return this.adminService.blindReview(id);
  }
}
