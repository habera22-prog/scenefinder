import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { BookingStatus, UserRole, UserStatus } from '@scenefinder/database';
import { AdminService } from './admin.service';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { CreateShootCategoryDto } from './dto/create-shoot-category.dto';
import { UpdateShootCategoryDto } from './dto/update-shoot-category.dto';
import { CreateCaptureModeDto } from './dto/create-capture-mode.dto';
import { UpdateCaptureModeDto } from './dto/update-capture-mode.dto';
import { UpdateInquiryStatusDto } from './dto/update-inquiry-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';

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

  @Get('capture-modes')
  listCaptureModes() {
    return this.adminService.listAllCaptureModes();
  }

  @Post('capture-modes')
  createCaptureMode(@Body() dto: CreateCaptureModeDto) {
    return this.adminService.createCaptureMode(dto);
  }

  @Patch('capture-modes/:id')
  updateCaptureMode(
    @Param('id') id: string,
    @Body() dto: UpdateCaptureModeDto,
  ) {
    return this.adminService.updateCaptureMode(id, dto);
  }

  @Get('inquiries/corporate')
  listCorporateInquiries(
    @Query('status') status?: 'received' | 'reviewing' | 'matched' | 'closed',
  ) {
    return this.adminService.listCorporateInquiries(status);
  }

  @Patch('inquiries/corporate/:id')
  updateCorporateInquiryStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInquiryStatusDto,
  ) {
    return this.adminService.updateCorporateInquiryStatus(id, dto);
  }

  @Get('inquiries/partnership')
  listPartnershipInquiries(
    @Query('status') status?: 'received' | 'reviewing' | 'matched' | 'closed',
  ) {
    return this.adminService.listPartnershipInquiries(status);
  }

  @Patch('inquiries/partnership/:id')
  updatePartnershipInquiryStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInquiryStatusDto,
  ) {
    return this.adminService.updatePartnershipInquiryStatus(id, dto);
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

  @Patch('bookings/:id')
  updateBooking(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.adminService.updateBooking(id, dto);
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

  @Get('coupons')
  listCoupons() {
    return this.adminService.listCoupons();
  }

  @Post('coupons')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.adminService.createCoupon(dto);
  }

  @Post('coupons/:id/deactivate')
  deactivateCoupon(@Param('id') id: string) {
    return this.adminService.deactivateCoupon(id);
  }

  @Get('stats/export')
  async exportStats(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.adminService.exportPaymentsCsv(from, to);
    const filename = `payments_${from ?? 'all'}_${to ?? 'all'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv);
  }
}
