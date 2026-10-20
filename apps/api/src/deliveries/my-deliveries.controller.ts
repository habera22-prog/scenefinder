import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
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

  @Get(':deliveryId/photos/:photoIndex')
  @Header('Cache-Control', 'private, no-store')
  async downloadPhoto(
    @Param('deliveryId') deliveryId: string,
    @Param('photoIndex', ParseIntPipe) photoIndex: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const photo = await this.deliveriesService.getCustomerPhotoFile(
      deliveryId,
      user.userId,
      photoIndex,
    );
    return new StreamableFile(createReadStream(photo.filePath), {
      type: photo.contentType,
      disposition: `attachment; filename="${photo.filename}"`,
      length: photo.size,
    });
  }
}
