import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PhotographersService } from './photographers.service';
import { ApplyPhotographerDto } from './dto/apply-photographer.dto';
import { SearchPhotographersQueryDto } from './dto/search-photographers-query.dto';

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

  @Get(':id/verification-status')
  getVerificationStatus(@Param('id') id: string) {
    return this.photographersService.getVerificationStatus(id);
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.photographersService.getProfile(id);
  }
}
