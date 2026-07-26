import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { BookingStatus, UserRole, UserStatus } from '@scenefinder/database';
import { AdminService } from './admin.service';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { CreateShootCategoryDto } from './dto/create-shoot-category.dto';
import { UpdateShootCategoryDto } from './dto/update-shoot-category.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.adminService.getDashboard();
  }

  @Get('photographers')
  listPhotographers(
    @Query('status') status?: 'pending' | 'verified' | 'rejected',
  ) {
    return this.adminService.listPhotographers(status);
  }

  @Get('payments')
  listPayments(
    @Query('status')
    status?: 'pending' | 'completed' | 'cancelled' | 'expired' | 'failed',
  ) {
    return this.adminService.listPayments(status);
  }

  @Get('reviews')
  listReviews(@Query('blinded') blinded?: string) {
    return this.adminService.listReviews(
      blinded === undefined ? undefined : blinded === 'true',
    );
  }

  @Get('disputes')
  listDisputes(
    @Query('status')
    status?: 'open' | 'fact_check_requested' | 'resolved' | 'escalated',
  ) {
    return this.adminService.listDisputes(status);
  }

  @Get('support-tickets')
  listSupportTickets(@Query('status') status?: 'open' | 'answered' | 'closed') {
    return this.adminService.listSupportTickets(status);
  }

  @Post('support-tickets/:id/respond')
  respondToTicket(@Param('id') id: string, @Body('response') response: string) {
    return this.adminService.respondToTicket(id, response);
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

  @Get('shoot-categories')
  listShootCategories() {
    return this.adminService.listAllShootCategories();
  }

  @Post('shoot-categories')
  createShootCategory(@Body() dto: CreateShootCategoryDto) {
    return this.adminService.createShootCategory(dto);
  }

  @Patch('shoot-categories/:id')
  updateShootCategory(
    @Param('id') id: string,
    @Body() dto: UpdateShootCategoryDto,
  ) {
    return this.adminService.updateShootCategory(id, dto);
  }

  @Delete('portfolios/:id')
  deletePortfolio(@Param('id') id: string) {
    return this.adminService.deletePortfolio(id);
  }

  @Delete('packages/:id')
  deletePackage(@Param('id') id: string) {
    return this.adminService.deletePackage(id);
  }

  @Get('bookings')
  listBookings(
    @Query('status') status?: BookingStatus,
    @Query('photographerId') photographerId?: string,
  ) {
    return this.adminService.listBookings(status, photographerId);
  }

  @Get('bookings/:id')
  getBookingDetail(@Param('id') id: string) {
    return this.adminService.getBookingDetail(id);
  }

  @Get('users')
  listUsers(
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
  ) {
    return this.adminService.listUsers(role, status);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Post('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.adminService.setUserStatus(id, 'suspended');
  }

  @Post('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.adminService.setUserStatus(id, 'active');
  }
}
