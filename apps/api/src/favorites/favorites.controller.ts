import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('favorites')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFavoriteDto,
  ) {
    return this.favoritesService.create(user.userId, dto.photographerId);
  }

  @Delete('favorites/:photographerId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('photographerId') photographerId: string,
  ) {
    return this.favoritesService.remove(user.userId, photographerId);
  }

  @Get('customers/me/favorites')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.listForCustomer(user.userId);
  }
}
