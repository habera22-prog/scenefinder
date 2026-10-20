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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PhotographersService } from './photographers.service';
import { ApplyPhotographerDto } from './dto/apply-photographer.dto';
import { SearchPhotographersQueryDto } from './dto/search-photographers-query.dto';
import { AddAvailabilityDto } from './dto/add-availability.dto';
import { UpdatePhotographerDto } from './dto/update-photographer.dto';

@Controller('photographers')
export class PhotographersController {
  constructor(private readonly photographersService: PhotographersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  apply(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyPhotographerDto,
  ) {
    return this.photographersService.apply(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('business-verification')
  requestBusinessVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.photographersService.requestBusinessVerification(user.userId);
  }

  @Get()
  search(@Query() query: SearchPhotographersQueryDto) {
    return this.photographersService.search(query);
  }

  @Get('regions')
  listRegions() {
    return this.photographersService.listRegions();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.photographersService.getByUserId(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePhotographerDto,
  ) {
    return this.photographersService.updateProfile(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/availability')
  addUnavailableDate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddAvailabilityDto,
  ) {
    return this.photographersService.addUnavailableDate(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/availability/:dateId')
  removeUnavailableDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dateId') dateId: string,
  ) {
    return this.photographersService.removeUnavailableDate(user.userId, dateId);
  }

  @Get(':id/verification-status')
  getVerificationStatus(@Param('id') id: string) {
    return this.photographersService.getVerificationStatus(id);
  }

  @Get(':id/availability')
  listUnavailableDates(@Param('id') id: string) {
    return this.photographersService.listUnavailableDates(id);
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.photographersService.getProfile(id);
  }
}
