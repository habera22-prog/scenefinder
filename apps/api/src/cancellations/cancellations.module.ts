import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CancellationsController } from './cancellations.controller';
import { CancellationsService } from './cancellations.service';

@Module({
  imports: [NotificationsModule],
  controllers: [CancellationsController],
  providers: [CancellationsService],
})
export class CancellationsModule {}
