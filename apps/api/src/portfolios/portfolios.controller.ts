import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import {
  ReorderPortfoliosDto,
  UpdatePortfolioDto,
} from './dto/update-portfolio.dto';

@UseGuards(JwtAuthGuard)
@Controller('photographers/:photographerId/portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Patch('order')
  reorder(
    @Param('photographerId') photographerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderPortfoliosDto,
  ) {
    return this.portfoliosService.reorder(
      photographerId,
      user.userId,
      dto.portfolioIds,
    );
  }

  @Patch(':portfolioId')
  update(
    @Param('photographerId') photographerId: string,
    @Param('portfolioId') portfolioId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.portfoliosService.update(
      photographerId,
      portfolioId,
      user.userId,
      dto,
    );
  }

  @Delete(':portfolioId')
  remove(
    @Param('photographerId') photographerId: string,
    @Param('portfolioId') portfolioId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.portfoliosService.remove(
      photographerId,
      portfolioId,
      user.userId,
    );
  }

  @Post()
  create(
    @Param('photographerId') photographerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePortfolioDto,
  ) {
    return this.portfoliosService.create(photographerId, user.userId, dto);
  }
}
