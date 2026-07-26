import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingDeliveriesController } from './deliveries.controller';
import { DeliveryActionsController } from './revisions.controller';
import { MyDeliveriesController } from './my-deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { AutoConfirmDeliveryJob } from './auto-confirm.job';
import { DownloadExpiryReminderJob } from './download-expiry-reminder.job';

@Module({
  imports: [NotificationsModule],
  controllers: [
    BookingDeliveriesController,
    DeliveryActionsController,
    MyDeliveriesController,
  ],
  providers: [
    DeliveriesService,
    AutoConfirmDeliveryJob,
    DownloadExpiryReminderJob,
  ],
})
export class DeliveriesModule {}
