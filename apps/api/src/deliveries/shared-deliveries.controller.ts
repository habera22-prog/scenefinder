import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { DeliveriesService } from './deliveries.service';

@Controller('shared/deliveries')
export class SharedDeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  getDelivery(@Param('token') token: string) {
    return this.deliveriesService.getSharedDelivery(token);
  }

  @Get(':token/photos/:photoIndex')
  @Header('Cache-Control', 'no-store')
  async getPhoto(
    @Param('token') token: string,
    @Param('photoIndex', ParseIntPipe) photoIndex: number,
    @Query('download') download?: string,
  ) {
    const photo = await this.deliveriesService.getSharedPhotoFile(
      token,
      photoIndex,
    );
    const disposition = download === '1' ? 'attachment' : 'inline';
    return new StreamableFile(createReadStream(photo.filePath), {
      type: photo.contentType,
      disposition: `${disposition}; filename="${photo.filename}"`,
      length: photo.size,
    });
  }
}
