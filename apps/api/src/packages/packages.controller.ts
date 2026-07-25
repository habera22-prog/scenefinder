import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';

@UseGuards(JwtAuthGuard)
@Controller('photographers/:photographerId/packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  create(
    @Param('photographerId') photographerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePackageDto,
  ) {
    return this.packagesService.create(photographerId, user.userId, dto);
  }
}
